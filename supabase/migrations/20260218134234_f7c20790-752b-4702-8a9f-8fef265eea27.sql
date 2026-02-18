
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- clinical_config
DROP POLICY IF EXISTS "Users can read own clinical config" ON public.clinical_config;
DROP POLICY IF EXISTS "Users can create own clinical config" ON public.clinical_config;
DROP POLICY IF EXISTS "Users can update own clinical config" ON public.clinical_config;
DROP POLICY IF EXISTS "Users can delete own clinical config" ON public.clinical_config;

CREATE POLICY "Users can read own clinical config" ON public.clinical_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own clinical config" ON public.clinical_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clinical config" ON public.clinical_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clinical config" ON public.clinical_config FOR DELETE USING (auth.uid() = user_id);

-- goals
DROP POLICY IF EXISTS "Users can read own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

CREATE POLICY "Users can read own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- user_kommo_credentials
DROP POLICY IF EXISTS "Users can view own credentials" ON public.user_kommo_credentials;
DROP POLICY IF EXISTS "Users can insert own credentials" ON public.user_kommo_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON public.user_kommo_credentials;
DROP POLICY IF EXISTS "Users can delete own credentials" ON public.user_kommo_credentials;

CREATE POLICY "Users can view own credentials" ON public.user_kommo_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credentials" ON public.user_kommo_credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credentials" ON public.user_kommo_credentials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credentials" ON public.user_kommo_credentials FOR DELETE USING (auth.uid() = user_id);

-- kommo_logs
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.kommo_logs;
DROP POLICY IF EXISTS "Authenticated users can read logs" ON public.kommo_logs;

CREATE POLICY "Anyone can insert logs" ON public.kommo_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can read logs" ON public.kommo_logs FOR SELECT USING (auth.role() = 'authenticated'::text);
