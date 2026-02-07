-- Create table to track scheduled debt reminders
CREATE TABLE public.debt_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_day INTEGER NOT NULL CHECK (reminder_day IN (3, 7, 14)),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  skip_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(debt_id, reminder_day)
);

-- Enable RLS
ALTER TABLE public.debt_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own reminders" 
ON public.debt_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" 
ON public.debt_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" 
ON public.debt_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" 
ON public.debt_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_debt_reminders_updated_at
BEFORE UPDATE ON public.debt_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create function to schedule reminders when debt is created
CREATE OR REPLACE FUNCTION public.schedule_debt_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule for debts with outstanding balance and phone number
  IF NEW.total_amount > NEW.paid_amount AND NEW.customer_phone IS NOT NULL THEN
    -- Schedule 3-day reminder
    INSERT INTO public.debt_reminders (debt_id, user_id, reminder_day, scheduled_at)
    VALUES (NEW.id, NEW.user_id, 3, NEW.date + INTERVAL '3 days')
    ON CONFLICT (debt_id, reminder_day) DO NOTHING;
    
    -- Schedule 7-day reminder
    INSERT INTO public.debt_reminders (debt_id, user_id, reminder_day, scheduled_at)
    VALUES (NEW.id, NEW.user_id, 7, NEW.date + INTERVAL '7 days')
    ON CONFLICT (debt_id, reminder_day) DO NOTHING;
    
    -- Schedule 14-day reminder
    INSERT INTO public.debt_reminders (debt_id, user_id, reminder_day, scheduled_at)
    VALUES (NEW.id, NEW.user_id, 14, NEW.date + INTERVAL '14 days')
    ON CONFLICT (debt_id, reminder_day) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-schedule reminders on debt creation
CREATE TRIGGER schedule_debt_reminders_trigger
AFTER INSERT ON public.debts
FOR EACH ROW
EXECUTE FUNCTION public.schedule_debt_reminders();

-- Create function to skip reminders when debt is paid
CREATE OR REPLACE FUNCTION public.update_debt_reminder_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If debt is fully paid, skip all pending reminders
  IF NEW.total_amount <= NEW.paid_amount THEN
    UPDATE public.debt_reminders
    SET status = 'skipped', 
        skip_reason = 'Debt fully paid',
        updated_at = now()
    WHERE debt_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update reminder status when debt is updated
CREATE TRIGGER update_debt_reminder_status_trigger
AFTER UPDATE ON public.debts
FOR EACH ROW
EXECUTE FUNCTION public.update_debt_reminder_status();

-- Add index for efficient reminder queries
CREATE INDEX idx_debt_reminders_pending ON public.debt_reminders (status, scheduled_at) WHERE status = 'pending';

-- Enable realtime for debt_reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_reminders;