-- CLOUD-SYNC-CRITICAL: Enable Supabase Realtime for all business data tables
-- This allows instant synchronization across all devices

-- Enable realtime for sales table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- Enable realtime for expenses table
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;

-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Enable realtime for customers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;

-- Enable realtime for debts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;

-- Enable realtime for debt_payments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payments;