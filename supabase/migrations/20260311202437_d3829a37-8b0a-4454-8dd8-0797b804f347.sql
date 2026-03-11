-- Remove the INSERT policy that allows any user to self-assign any role (privilege escalation risk)
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;