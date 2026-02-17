
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela user_kommo_credentials
CREATE TABLE public.user_kommo_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_id TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  redirect_uri TEXT,
  account_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_name TEXT NOT NULL DEFAULT 'Conta Principal',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_kommo_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials" ON public.user_kommo_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credentials" ON public.user_kommo_credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credentials" ON public.user_kommo_credentials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credentials" ON public.user_kommo_credentials FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_kommo_credentials_updated_at
  BEFORE UPDATE ON public.user_kommo_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela goals
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  period TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  product_name TEXT,
  seller_id INTEGER,
  seller_name TEXT,
  status_ids INTEGER[] DEFAULT '{}',
  pipeline_ids INTEGER[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read goals" ON public.goals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create goals" ON public.goals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update goals" ON public.goals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete goals" ON public.goals FOR DELETE USING (auth.role() = 'authenticated');

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela kommo_logs
CREATE TABLE public.kommo_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kommo_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert logs" ON public.kommo_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can read logs" ON public.kommo_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Função log_kommo_request
CREATE OR REPLACE FUNCTION public.log_kommo_request(
  p_action TEXT,
  p_request_data JSONB DEFAULT NULL,
  p_response_data JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.kommo_logs (action, request_data, response_data, error_message)
  VALUES (p_action, p_request_data, p_response_data, p_error_message)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função calculate_goal_progress
CREATE OR REPLACE FUNCTION public.calculate_goal_progress(
  p_goal_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_goal RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_goal FROM public.goals WHERE id = p_goal_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Goal not found');
  END IF;
  v_result := jsonb_build_object(
    'goal_id', v_goal.id,
    'name', v_goal.name,
    'target_value', v_goal.target_value,
    'target_type', v_goal.target_type,
    'period', v_goal.period,
    'start_date', v_goal.start_date,
    'end_date', v_goal.end_date,
    'is_active', v_goal.is_active
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
