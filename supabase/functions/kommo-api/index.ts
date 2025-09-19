import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KommoApiRequest {
  endpoint: string;
  method?: string;
  accessToken: string;
  accountUrl: string;
  body?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { endpoint, method = 'GET', accessToken, accountUrl, body }: KommoApiRequest = await req.json();

    if (!endpoint || !accessToken || !accountUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: 'endpoint, accessToken, and accountUrl are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construct the full Kommo API URL
    const kommoApiUrl = `${accountUrl}/api/v4${endpoint}`;
    
    console.log('Making request to Kommo API:', { 
      url: kommoApiUrl, 
      method,
      hasBody: !!body 
    });

    // Make request to Kommo API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const kommoResponse = await fetch(kommoApiUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KommoInsightHub/1.0'
        },
        signal: controller.signal,
        ...(body && { body: JSON.stringify(body) })
      });
      
      clearTimeout(timeoutId);

      console.log('Kommo API Response Status:', kommoResponse.status);

      if (!kommoResponse.ok) {
      const errorText = await kommoResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('Kommo API Error:', {
        status: kommoResponse.status,
        error: errorData,
        url: kommoApiUrl
      });

      return new Response(
        JSON.stringify({ 
          error: 'Kommo API Error', 
          status: kommoResponse.status,
          details: errorData.message || errorData.error || 'Unknown error',
          hint: kommoResponse.status === 401 ? 'Token inválido ou expirado' : 'Erro na API da Kommo'
        }),
        { 
          status: kommoResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

      // Handle empty responses (204 No Content)
      let responseData;
      if (kommoResponse.status === 204 || kommoResponse.headers.get('content-length') === '0') {
        responseData = { _embedded: {} };
      } else {
        const responseText = await kommoResponse.text();
        if (!responseText.trim()) {
          responseData = { _embedded: {} };
        } else {
          try {
            responseData = JSON.parse(responseText);
          } catch (error) {
            console.error('Failed to parse response as JSON:', responseText);
            responseData = { _embedded: {} };
          }
        }
      }
      
      console.log('Kommo API success for endpoint:', endpoint);

      return new Response(
        JSON.stringify(responseData),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Kommo API request timeout for:', kommoApiUrl);
        return new Response(
          JSON.stringify({ 
            error: 'Request timeout', 
            details: 'A requisição demorou mais que 30 segundos',
            hint: 'Tente novamente ou reduza o tamanho da requisição'
          }),
          { 
            status: 408, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw fetchError; // Re-throw other fetch errors
    }

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