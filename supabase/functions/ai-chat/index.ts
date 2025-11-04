import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, dashboardContext, aiConfig } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Build tone instructions based on config
    const toneInstructions: Record<string, string> = {
      formal: 'Use linguagem profissional e corporativa. Seja formal e técnico.',
      casual: 'Use comunicação amigável e direta. Seja acessível e conversacional.',
      technical: 'Foque em métricas detalhadas e análises técnicas. Use terminologia precisa.',
    };

    const tone = aiConfig?.tone || 'casual';
    const businessContext = aiConfig?.businessContext || '';
    const specialInstructions = aiConfig?.specialInstructions || '';

    let systemPrompt = `Você é um assistente de análise de dados do Kommo CRM. 
Você ajuda usuários a entender suas métricas de vendas, leads e performance.

${businessContext ? `CONTEXTO DO NEGÓCIO:\n${businessContext}\n` : ''}

DADOS DO DASHBOARD:
${dashboardContext ? JSON.stringify(dashboardContext, null, 2) : 'Nenhum contexto fornecido'}

DIRETRIZES:
- ${toneInstructions[tone]}
- Seja objetivo e direto nas respostas
- Use os dados fornecidos no contexto para dar insights específicos
- Quando não tiver dados suficientes, deixe claro
- Sugira ações práticas baseadas nos dados
- Formate números como moeda quando apropriado (R$)
- Use percentuais para taxas de conversão
- Seja proativo em identificar problemas e oportunidades
${specialInstructions ? `\nINSTRUÇÕES ESPECIAIS:\n${specialInstructions}` : ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos no workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar requisição' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Erro no ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
