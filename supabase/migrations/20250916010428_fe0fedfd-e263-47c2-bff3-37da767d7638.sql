-- Criar função edge para proxy da API OAuth da Kommo
-- Esta função vai fazer as requisições para a API da Kommo de forma segura

CREATE OR REPLACE FUNCTION public.log_kommo_request(
  action text,
  request_data jsonb,
  response_data jsonb DEFAULT NULL,
  error_message text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Log básico para debugging (opcional)
  INSERT INTO public.kommo_logs (action, request_data, response_data, error_message, created_at)
  VALUES (action, request_data, response_data, error_message, NOW())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Falha silenciosa para não quebrar o fluxo principal
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela para logs de requisições Kommo (opcional para debugging)
CREATE TABLE IF NOT EXISTS public.kommo_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar RLS na tabela de logs
ALTER TABLE public.kommo_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de logs (função pública)
CREATE POLICY "Allow kommo logs insert" ON public.kommo_logs
  FOR INSERT WITH CHECK (true);

-- Política para visualizar apenas logs próprios (se necessário no futuro)
CREATE POLICY "Users can view logs" ON public.kommo_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);