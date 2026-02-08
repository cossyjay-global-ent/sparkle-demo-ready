-- Create payment_records table for tracking Paystack payments
-- This is isolated from subscriptions table - does NOT auto-upgrade users

CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in kobo (NGN smallest unit)
  currency TEXT NOT NULL DEFAULT 'NGN',
  reference TEXT NOT NULL UNIQUE,
  paystack_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, cancelled
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment records
CREATE POLICY "Users can view own payment records"
ON public.payment_records
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own payment records
CREATE POLICY "Users can insert own payment records"
ON public.payment_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment records
CREATE POLICY "Users can update own payment records"
ON public.payment_records
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_records_updated_at
BEFORE UPDATE ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Index for faster lookups
CREATE INDEX idx_payment_records_user_id ON public.payment_records(user_id);
CREATE INDEX idx_payment_records_reference ON public.payment_records(reference);
CREATE INDEX idx_payment_records_status ON public.payment_records(status);