
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create own clinical config" ON public.clinical_config;
DROP POLICY IF EXISTS "Users can delete own clinical config" ON public.clinical_config;
DROP POLICY IF EXISTS "Users can read own clinical config" ON public.clinical_config;
DROP POLICY IF EXISTS "Users can update own clinical config" ON public.clinical_config;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can read own clinical config"
ON public.clinical_config
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clinical config"
ON public.clinical_config
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clinical config"
ON public.clinical_config
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clinical config"
ON public.clinical_config
FOR DELETE
USING (auth.uid() = user_id);
