-- Create table to store Kommo credentials per user
CREATE TABLE public.user_kommo_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  integration_id TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  redirect_uri TEXT,
  account_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_kommo_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own credentials
CREATE POLICY "Users can view own credentials" 
  ON public.user_kommo_credentials FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials" 
  ON public.user_kommo_credentials FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials" 
  ON public.user_kommo_credentials FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" 
  ON public.user_kommo_credentials FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_kommo_credentials_updated_at
  BEFORE UPDATE ON public.user_kommo_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();