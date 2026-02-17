
-- Add user_id column to goals table
ALTER TABLE public.goals ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Authenticated users can create goals" ON public.goals;
DROP POLICY IF EXISTS "Authenticated users can delete goals" ON public.goals;
DROP POLICY IF EXISTS "Authenticated users can read goals" ON public.goals;
DROP POLICY IF EXISTS "Authenticated users can update goals" ON public.goals;
DROP POLICY IF EXISTS "Anyone can view active goals" ON public.goals;

-- Create owner-scoped RLS policies
CREATE POLICY "Users can read own goals"
ON public.goals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
ON public.goals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
ON public.goals FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
ON public.goals FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
