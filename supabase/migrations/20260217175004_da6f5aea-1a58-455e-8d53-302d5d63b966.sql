
-- Add dashboard_mode to user_kommo_credentials
ALTER TABLE public.user_kommo_credentials
ADD COLUMN dashboard_mode text DEFAULT NULL;

-- Create clinical_config table for storing pipeline stage mappings and custom field selections
CREATE TABLE public.clinical_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  credential_id uuid NOT NULL REFERENCES public.user_kommo_credentials(id) ON DELETE CASCADE,
  
  -- Pipeline stage mappings for appointment tracking
  scheduled_pipeline_id integer,
  scheduled_status_id integer,
  completed_pipeline_id integer,
  completed_status_id integer,
  rescheduled_pipeline_id integer,
  rescheduled_status_id integer,
  procedure_pipeline_id integer,
  procedure_status_id integer,
  
  -- Custom field IDs for doctors and procedures
  doctor_custom_field_id integer,
  procedure_custom_field_id integer,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, credential_id)
);

-- Enable RLS
ALTER TABLE public.clinical_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own clinical config"
ON public.clinical_config FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clinical config"
ON public.clinical_config FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clinical config"
ON public.clinical_config FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clinical config"
ON public.clinical_config FOR DELETE
USING (auth.uid() = user_id);
