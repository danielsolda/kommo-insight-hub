-- Corrigir função log_kommo_request com search_path seguro
CREATE OR REPLACE FUNCTION public.log_kommo_request(
  action text,
  request_data jsonb,
  response_data jsonb DEFAULT NULL,
  error_message text DEFAULT NULL
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log básico para debugging (opcional)
  INSERT INTO public.kommo_logs (action, request_data, response_data, error_message, created_at)
  VALUES (action, request_data, response_data, error_message, NOW())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Falha silenciosa para não quebrar o fluxo principal
  NULL;
END;
$$;