-- SUBSCRIPTION SYSTEM TABLE
-- This table stores subscription data for monetization
-- DEVELOPER LIFETIME ACCESS: cossybest24@gmail.com has permanent admin access

-- Create subscription_plan enum if not exists (may already exist from profiles)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'cancelled');
  END IF;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  paystack_customer_id text,
  paystack_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription (on signup)
CREATE POLICY "Users can insert own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only service role can update subscriptions (via edge functions after payment verification)
-- Users cannot update their own subscription to prevent privilege escalation
CREATE POLICY "Service role updates subscriptions"
ON public.subscriptions
FOR UPDATE
USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for instant sync across devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- Create function to check subscription plan
CREATE OR REPLACE FUNCTION public.get_subscription_plan(_user_id uuid)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.subscriptions WHERE user_id = _user_id AND status = 'active'),
    'free'::subscription_plan
  )
$$;

-- Create function to check if user has minimum plan level
CREATE OR REPLACE FUNCTION public.has_minimum_plan(_user_id uuid, _required_plan subscription_plan)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _required_plan = 'free' THEN true
    WHEN _required_plan = 'pro' THEN 
      EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status = 'active' AND plan IN ('pro', 'business'))
    WHEN _required_plan = 'business' THEN 
      EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status = 'active' AND plan = 'business')
    ELSE false
  END
$$;