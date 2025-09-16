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
  client_secret: string;
  redirect_uri?: string;
  refresh_token?: string;
  grant_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tokenRequest: TokenRequest = await req.json();
    console.log('Kommo OAuth Request:', { action: tokenRequest.action, grant_type: tokenRequest.grant_type });

    // Preparar dados para requisição à API da Kommo
    let requestBody: any = {
      client_id: tokenRequest.client_id,
      client_secret: tokenRequest.client_secret,
      grant_type: tokenRequest.grant_type,
    };

    if (tokenRequest.action === 'exchange_code') {
      requestBody.code = tokenRequest.code;
      requestBody.redirect_uri = tokenRequest.redirect_uri;
    } else if (tokenRequest.action === 'refresh_token') {
      requestBody.refresh_token = tokenRequest.refresh_token;
    }

    // Fazer requisição para a API OAuth da Kommo
    const kommoResponse = await fetch('https://www.kommo.com/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KommoInsightHub/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Kommo Response Status:', kommoResponse.status);

    if (!kommoResponse.ok) {
      const errorText = await kommoResponse.text();
      console.error('Kommo API Error:', errorText);
      
      // Log do erro
      await supabase.rpc('log_kommo_request', {
        action: tokenRequest.action,
        request_data: { 
          grant_type: tokenRequest.grant_type,
          client_id: tokenRequest.client_id 
        },
        error_message: `HTTP ${kommoResponse.status}: ${errorText}`
      });

      return new Response(
        JSON.stringify({ 
          error: 'Kommo API error', 
          details: errorText,
          status: kommoResponse.status 
        }),
        { 
          status: kommoResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tokenData = await kommoResponse.json();
    console.log('Kommo Token Response received successfully');

    // Log da requisição bem-sucedida
    await supabase.rpc('log_kommo_request', {
      action: tokenRequest.action,
      request_data: { 
        grant_type: tokenRequest.grant_type,
        client_id: tokenRequest.client_id 
      },
      response_data: {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        has_access_token: !!tokenData.access_token,
        has_refresh_token: !!tokenData.refresh_token
      }
    });

    // Retornar tokens para o cliente
    return new Response(
      JSON.stringify(tokenData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge Function Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})