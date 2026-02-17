import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenRequest {
  action: 'exchange_code' | 'refresh_token';
  code?: string;
  client_id: string;
  credential_id: string;
  redirect_uri?: string;
  refresh_token?: string;
  grant_type: string;
  account_url?: string;
  // Legacy support - will be ignored if credential_id is provided
  client_secret?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenRequest: TokenRequest = await req.json();
    console.log('Kommo OAuth Request:', { 
      action: tokenRequest.action, 
      grant_type: tokenRequest.grant_type,
      has_account_url: !!tokenRequest.account_url,
      has_credential_id: !!tokenRequest.credential_id
    });

    if (!tokenRequest.account_url) {
      return new Response(
        JSON.stringify({ error: 'account_url is required', details: 'Please provide the Kommo account URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the client_secret server-side from the database
    let clientSecret = '';
    
    if (tokenRequest.credential_id) {
      // Use service role to fetch the secret from user_kommo_credentials
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Verify the user owns this credential by checking the JWT
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUser = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
        
        if (userError || !user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized', details: 'Invalid authentication token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch credential ensuring it belongs to the authenticated user
        const { data: credential, error: credError } = await supabaseAdmin
          .from('user_kommo_credentials')
          .select('secret_key')
          .eq('id', tokenRequest.credential_id)
          .eq('user_id', user.id)
          .single();

        if (credError || !credential) {
          return new Response(
            JSON.stringify({ error: 'Credential not found', details: 'Could not find the specified credential' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        clientSecret = credential.secret_key;
      } else {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', details: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (tokenRequest.client_secret) {
      // Legacy fallback - accept client_secret directly (backward compat)
      clientSecret = tokenRequest.client_secret;
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing credentials', details: 'credential_id or client_secret required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract subdomain
    let accountSubdomain = '';
    try {
      const accountUrl = new URL(tokenRequest.account_url);
      accountSubdomain = accountUrl.hostname.split('.')[0];
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid account URL format', details: 'Please check your Kommo account URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody: any = {
      client_id: tokenRequest.client_id,
      client_secret: clientSecret,
      grant_type: tokenRequest.grant_type,
    };

    if (tokenRequest.action === 'exchange_code') {
      requestBody.code = tokenRequest.code;
      requestBody.redirect_uri = tokenRequest.redirect_uri;
    } else if (tokenRequest.action === 'refresh_token') {
      requestBody.refresh_token = tokenRequest.refresh_token;
      if (tokenRequest.redirect_uri) {
        requestBody.redirect_uri = tokenRequest.redirect_uri;
      }
    }

    const kommoApiUrl = `https://${accountSubdomain}.kommo.com/oauth2/access_token`;
    console.log('Using Kommo API URL:', kommoApiUrl);

    const supabaseLog = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const kommoResponse = await fetch(kommoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'KommoInsightHub/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Kommo Response Status:', kommoResponse.status);

    if (!kommoResponse.ok) {
      const errorText = await kommoResponse.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
      
      console.error('Kommo API Error:', { status: kommoResponse.status, error: errorData });
      
      await supabaseLog.rpc('log_kommo_request', {
        action: tokenRequest.action,
        request_data: { grant_type: tokenRequest.grant_type, account_subdomain: accountSubdomain },
        error_message: `HTTP ${kommoResponse.status}: ${JSON.stringify(errorData)}`
      });

      return new Response(
        JSON.stringify({ 
          error: 'Kommo API Error', 
          status: kommoResponse.status,
          details: errorData.message || errorData.error || 'Unknown error',
          hint: kommoResponse.status === 400 ? 'Verifique suas credenciais e URL da conta' : 'Erro interno da API da Kommo'
        }),
        { status: kommoResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await kommoResponse.json();
    console.log('Kommo API success:', { token_type: tokenData.token_type, expires_in: tokenData.expires_in });

    await supabaseLog.rpc('log_kommo_request', {
      action: tokenRequest.action,
      request_data: { grant_type: tokenRequest.grant_type, account_subdomain: accountSubdomain },
      response_data: {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        has_access_token: !!tokenData.access_token,
        has_refresh_token: !!tokenData.refresh_token
      }
    });

    return new Response(
      JSON.stringify(tokenData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})