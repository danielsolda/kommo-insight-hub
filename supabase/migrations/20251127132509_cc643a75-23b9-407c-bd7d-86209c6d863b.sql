-- Remove unique constraint on user_id to allow multiple accounts per user
ALTER TABLE public.user_kommo_credentials 
DROP CONSTRAINT IF EXISTS user_kommo_credentials_user_id_key;

-- Add column for account name
ALTER TABLE public.user_kommo_credentials 
ADD COLUMN IF NOT EXISTS account_name TEXT NOT NULL DEFAULT 'Conta Principal';

-- Add column for active account indicator
ALTER TABLE public.user_kommo_credentials 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_kommo_credentials_user_active 
ON public.user_kommo_credentials(user_id, is_active);