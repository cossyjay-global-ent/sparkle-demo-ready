
-- 1. Remove payment_records UPDATE policy (payment records should be immutable from client)
DROP POLICY IF EXISTS "Users can update own payment records" ON public.payment_records;

-- 2. Remove subscriptions INSERT policy that allows arbitrary plan escalation
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- 3. Replace profiles UPDATE policy with column-restricted version
-- (prevents users from modifying subscription_plan directly)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile safe"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND subscription_plan = (SELECT subscription_plan FROM public.profiles WHERE user_id = auth.uid())
);
