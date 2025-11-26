-- Create enum for goal types
CREATE TYPE public.goal_type AS ENUM ('product', 'seller', 'team');

-- Create enum for target types
CREATE TYPE public.goal_target_type AS ENUM ('quantity', 'value');

-- Create enum for goal periods
CREATE TYPE public.goal_period AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly', 'custom');

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type goal_type NOT NULL,
  target_type goal_target_type NOT NULL,
  target_value DECIMAL(15,2) NOT NULL,
  period goal_period NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  product_name TEXT,
  seller_id INTEGER,
  seller_name TEXT,
  status_ids INTEGER[] DEFAULT '{}',
  pipeline_ids INTEGER[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create index for faster queries
CREATE INDEX idx_goals_active ON public.goals(is_active, start_date, end_date);
CREATE INDEX idx_goals_seller ON public.goals(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX idx_goals_period ON public.goals(period, start_date);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active goals"
  ON public.goals
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create goals"
  ON public.goals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update goals"
  ON public.goals
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete goals"
  ON public.goals
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate goal progress
CREATE OR REPLACE FUNCTION public.calculate_goal_progress(
  goal_id UUID,
  leads_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  goal_record RECORD;
  current_value DECIMAL;
  progress_percentage DECIMAL;
  result JSONB;
BEGIN
  -- Get goal details
  SELECT * INTO goal_record FROM public.goals WHERE id = goal_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Goal not found');
  END IF;
  
  -- Calculate current value from leads_data
  -- This is a placeholder - the actual calculation will be done in the frontend
  current_value := 0;
  progress_percentage := CASE 
    WHEN goal_record.target_value > 0 THEN (current_value / goal_record.target_value) * 100
    ELSE 0
  END;
  
  result := jsonb_build_object(
    'goal_id', goal_record.id,
    'current_value', current_value,
    'target_value', goal_record.target_value,
    'progress_percentage', progress_percentage,
    'is_completed', current_value >= goal_record.target_value
  );
  
  RETURN result;
END;
$$;