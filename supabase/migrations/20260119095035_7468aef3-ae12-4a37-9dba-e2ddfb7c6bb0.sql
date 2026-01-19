-- Fix RLS policies: Change from RESTRICTIVE to PERMISSIVE
-- The issue is that all policies are created as RESTRICTIVE (Permissive: No)
-- When there are NO permissive policies, access is denied by default

-- Products table - Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Sales table
DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete own sales" ON public.sales;

CREATE POLICY "Users can insert own sales" ON public.sales
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sales" ON public.sales
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sales" ON public.sales
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales" ON public.sales
  FOR DELETE
  USING (auth.uid() = user_id);

-- Expenses table
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Customers table
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;

CREATE POLICY "Users can insert own customers" ON public.customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own customers" ON public.customers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON public.customers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON public.customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Debts table
DROP POLICY IF EXISTS "Users can insert own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can view own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can update own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can delete own debts" ON public.debts;

CREATE POLICY "Users can insert own debts" ON public.debts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own debts" ON public.debts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own debts" ON public.debts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts" ON public.debts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Debt Payments table
DROP POLICY IF EXISTS "Users can insert own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can view own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can update own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can delete own debt payments" ON public.debt_payments;

CREATE POLICY "Users can insert own debt payments" ON public.debt_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own debt payments" ON public.debt_payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own debt payments" ON public.debt_payments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debt payments" ON public.debt_payments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Profiles table
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- User roles table
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can insert own role on signup" ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Audit logs table
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Users can insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));