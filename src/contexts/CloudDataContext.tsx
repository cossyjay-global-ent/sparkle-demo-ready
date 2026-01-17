/**
 * CLOUD-SYNC-CRITICAL: Cloud Data Context
 * This is the SINGLE SOURCE OF TRUTH for all business data.
 * All data is stored in Supabase and synchronized in real-time across devices.
 * NO localStorage or in-memory persistence - everything comes from the cloud.
 */

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useRBAC } from './RBACContext';
import { toast } from '@/hooks/use-toast';
import { useMultiTableRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Type aliases for Supabase tables
type Product = Tables<'products'>;
type Sale = Tables<'sales'>;
type Expense = Tables<'expenses'>;
type Customer = Tables<'customers'>;
type Debt = Tables<'debts'>;
type DebtPayment = Tables<'debt_payments'>;

// Types for insert operations (without auto-generated fields)
type ProductInsert = Omit<TablesInsert<'products'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type SaleInsert = Omit<TablesInsert<'sales'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type ExpenseInsert = Omit<TablesInsert<'expenses'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type CustomerInsert = Omit<TablesInsert<'customers'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type DebtInsert = Omit<TablesInsert<'debts'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type DebtPaymentInsert = Omit<TablesInsert<'debt_payments'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface CloudDataContextType {
  // Products
  addProduct: (data: ProductInsert) => Promise<Product | null>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProducts: () => Promise<Product[]>;

  // Sales
  addSale: (data: SaleInsert) => Promise<Sale | null>;
  getSales: (startDate?: Date, endDate?: Date) => Promise<Sale[]>;
  deleteSale: (id: string) => Promise<boolean>;

  // Expenses
  addExpense: (data: ExpenseInsert) => Promise<Expense | null>;
  getExpenses: (startDate?: Date, endDate?: Date) => Promise<Expense[]>;
  deleteExpense: (id: string) => Promise<boolean>;

  // Customers
  addCustomer: (data: CustomerInsert) => Promise<Customer | null>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  getCustomers: () => Promise<Customer[]>;

  // Debts
  addDebt: (data: DebtInsert) => Promise<Debt | null>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;
  getDebts: (startDate?: Date, endDate?: Date) => Promise<Debt[]>;

  // Debt Payments
  addDebtPayment: (data: DebtPaymentInsert) => Promise<DebtPayment | null>;
  getDebtPayments: (debtId: string) => Promise<DebtPayment[]>;

  // Real-time sync state
  lastSyncTime: Date | null;
  isRefreshing: boolean;
  refreshAllData: () => Promise<void>;

  // Data version for triggering re-renders on real-time updates
  dataVersion: number;
}

const CloudDataContext = createContext<CloudDataContextType | undefined>(undefined);

export function CloudDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { logAction, canDeleteDebt } = useRBAC();
  
  // CLOUD-SYNC-CRITICAL: Track data version for real-time updates
  const [dataVersion, setDataVersion] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CLOUD-SYNC-CRITICAL: Increment data version on any real-time change
  const handleRealtimeChange = useCallback(() => {
    console.log('[CloudData] Real-time change detected, incrementing data version');
    setDataVersion((v) => v + 1);
    setLastSyncTime(new Date());
  }, []);

  // CLOUD-SYNC-CRITICAL: Subscribe to real-time changes on all data tables
  useMultiTableRealtimeSubscription({
    tables: ['products', 'sales', 'expenses', 'customers', 'debts', 'debt_payments'],
    userId: user?.id,
    onAnyChange: handleRealtimeChange,
    enabled: !!user?.id,
  });

  // CLOUD-SYNC-CRITICAL: Refresh all data (used on login and reconnect)
  const refreshAllData = useCallback(async () => {
    if (!user?.id) return;
    console.log('[CloudData] Refreshing all data from cloud');
    setIsRefreshing(true);
    setDataVersion((v) => v + 1);
    setLastSyncTime(new Date());
    setIsRefreshing(false);
  }, [user?.id]);

  // CLOUD-SYNC-CRITICAL: Refresh data on login
  useEffect(() => {
    if (user?.id) {
      console.log('[CloudData] User logged in, fetching latest cloud data');
      refreshAllData();
    }
  }, [user?.id, refreshAllData]);

  // ==================== PRODUCTS ====================
  
  const addProduct = useCallback(async (data: ProductInsert): Promise<Product | null> => {
    if (!user?.id) return null;
    try {
      // CLOUD-SYNC-CRITICAL: Insert directly to Supabase
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      await logAction('create', 'products', product.id, `Created product: ${product.name}`, undefined, product);
      toast({ title: "Success", description: "Product added successfully" });
      return product;
    } catch (error) {
      console.error('Add product error:', error);
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
      return null;
    }
  }, [user?.id, logAction]);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await logAction('update', 'products', id, `Updated product`, undefined, data);
      return true;
    } catch (error) {
      console.error('Update product error:', error);
      return false;
    }
  }, [user?.id, logAction]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: existing } = await supabase
        .from('products')
        .select()
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await logAction('delete', 'products', id, `Deleted product: ${existing?.name}`, existing);
      toast({ title: "Success", description: "Product deleted successfully" });
      return true;
    } catch (error) {
      console.error('Delete product error:', error);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
      return false;
    }
  }, [user?.id, logAction]);

  const getProducts = useCallback(async (): Promise<Product[]> => {
    if (!user?.id) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get products error:', error);
      return [];
    }
  }, [user?.id]);

  // ==================== SALES ====================

  const addSale = useCallback(async (data: SaleInsert): Promise<Sale | null> => {
    if (!user?.id) return null;
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // CLOUD-SYNC-CRITICAL: Update product stock if productId is provided
      if (data.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', data.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, product.stock - (data.quantity || 1)) })
            .eq('id', data.product_id);
        }
      }

      await logAction('create', 'sales', sale.id, `Sale recorded: ${sale.product_name} x${sale.quantity}`, undefined, sale);
      toast({ title: "Success", description: "Sale recorded successfully" });
      return sale;
    } catch (error) {
      console.error('Add sale error:', error);
      toast({ title: "Error", description: "Failed to record sale", variant: "destructive" });
      return null;
    }
  }, [user?.id, logAction]);

  const getSales = useCallback(async (startDate?: Date, endDate?: Date): Promise<Sale[]> => {
    if (!user?.id) return [];
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get sales error:', error);
      return [];
    }
  }, [user?.id]);

  const deleteSale = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: existing } = await supabase
        .from('sales')
        .select()
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await logAction('delete', 'sales', id, `Deleted sale: ${existing?.product_name}`, existing);
      toast({ title: "Success", description: "Sale deleted successfully" });
      return true;
    } catch (error) {
      console.error('Delete sale error:', error);
      toast({ title: "Error", description: "Failed to delete sale", variant: "destructive" });
      return false;
    }
  }, [user?.id, logAction]);

  // ==================== EXPENSES ====================

  const addExpense = useCallback(async (data: ExpenseInsert): Promise<Expense | null> => {
    if (!user?.id) return null;
    try {
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      await logAction('create', 'expenses', expense.id, `Expense added: ${expense.description}`, undefined, expense);
      toast({ title: "Success", description: "Expense added successfully" });
      return expense;
    } catch (error) {
      console.error('Add expense error:', error);
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
      return null;
    }
  }, [user?.id, logAction]);

  const getExpenses = useCallback(async (startDate?: Date, endDate?: Date): Promise<Expense[]> => {
    if (!user?.id) return [];
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get expenses error:', error);
      return [];
    }
  }, [user?.id]);

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: existing } = await supabase
        .from('expenses')
        .select()
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await logAction('delete', 'expenses', id, `Deleted expense: ${existing?.description}`, existing);
      toast({ title: "Success", description: "Expense deleted successfully" });
      return true;
    } catch (error) {
      console.error('Delete expense error:', error);
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
      return false;
    }
  }, [user?.id, logAction]);

  // ==================== CUSTOMERS ====================

  const addCustomer = useCallback(async (data: CustomerInsert): Promise<Customer | null> => {
    if (!user?.id) return null;
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      await logAction('create', 'customers', customer.id, `Customer added: ${customer.name}`, undefined, customer);
      toast({ title: "Success", description: "Customer added successfully" });
      return customer;
    } catch (error) {
      console.error('Add customer error:', error);
      toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
      return null;
    }
  }, [user?.id, logAction]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await logAction('update', 'customers', id, `Updated customer`, undefined, data);
      return true;
    } catch (error) {
      console.error('Update customer error:', error);
      return false;
    }
  }, [user?.id, logAction]);

  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: existing } = await supabase
        .from('customers')
        .select()
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await logAction('delete', 'customers', id, `Deleted customer: ${existing?.name}`, existing);
      toast({ title: "Success", description: "Customer deleted successfully" });
      return true;
    } catch (error) {
      console.error('Delete customer error:', error);
      toast({ title: "Error", description: "Failed to delete customer", variant: "destructive" });
      return false;
    }
  }, [user?.id, logAction]);

  const getCustomers = useCallback(async (): Promise<Customer[]> => {
    if (!user?.id) return [];
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get customers error:', error);
      return [];
    }
  }, [user?.id]);

  // ==================== DEBTS ====================

  const addDebt = useCallback(async (data: DebtInsert): Promise<Debt | null> => {
    if (!user?.id) return null;
    try {
      const { data: debt, error } = await supabase
        .from('debts')
        .insert({
          ...data,
          user_id: user.id,
          delete_status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      await logAction('create', 'debts', debt.id, `Debt created for: ${debt.customer_name} - ${debt.total_amount}`, undefined, debt);
      toast({ title: "Success", description: "Debt recorded successfully" });
      return debt;
    } catch (error) {
      console.error('Add debt error:', error);
      toast({ title: "Error", description: "Failed to add debt", variant: "destructive" });
      return null;
    }
  }, [user?.id, logAction]);

  const updateDebt = useCallback(async (id: string, data: Partial<Debt>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('debts')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await logAction('update', 'debts', id, `Updated debt`, undefined, data);
      return true;
    } catch (error) {
      console.error('Update debt error:', error);
      return false;
    }
  }, [user?.id, logAction]);

  const deleteDebt = useCallback(async (id: string): Promise<boolean> => {
    if (!canDeleteDebt) {
      toast({ title: "Access Denied", description: "You don't have permission to delete debts", variant: "destructive" });
      return false;
    }

    try {
      const { data: existing } = await supabase
        .from('debts')
        .select()
        .eq('id', id)
        .single();

      // Delete associated payments first
      await supabase
        .from('debt_payments')
        .delete()
        .eq('debt_id', id);

      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await logAction('delete', 'debts', id, `Deleted debt for: ${existing?.customer_name}`, existing);
      toast({ title: "Success", description: "Debt deleted successfully" });
      return true;
    } catch (error) {
      console.error('Delete debt error:', error);
      toast({ title: "Error", description: "Failed to delete debt", variant: "destructive" });
      return false;
    }
  }, [canDeleteDebt, logAction]);

  const getDebts = useCallback(async (startDate?: Date, endDate?: Date): Promise<Debt[]> => {
    if (!user?.id) return [];
    try {
      let query = supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .neq('delete_status', 'pending_delete')
        .order('date', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get debts error:', error);
      return [];
    }
  }, [user?.id]);

  // ==================== DEBT PAYMENTS ====================

  const addDebtPayment = useCallback(async (data: DebtPaymentInsert): Promise<DebtPayment | null> => {
    if (!user?.id) return null;
    try {
      const { data: payment, error } = await supabase
        .from('debt_payments')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update debt paid amount and status
      const { data: debt } = await supabase
        .from('debts')
        .select('paid_amount, total_amount')
        .eq('id', data.debt_id)
        .single();

      if (debt) {
        const newPaidAmount = (debt.paid_amount || 0) + (data.amount || 0);
        const newStatus = newPaidAmount >= debt.total_amount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';
        
        await supabase
          .from('debts')
          .update({ 
            paid_amount: newPaidAmount, 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.debt_id);
      }

      await logAction('payment', 'debt_payments', payment.id, `Payment of ${data.amount} recorded for debt`, undefined, payment);
      toast({ title: "Success", description: "Payment recorded successfully" });
      return payment;
    } catch (error) {
      console.error('Add debt payment error:', error);
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
      return null;
    }
  }, [user?.id, logAction]);

  const getDebtPayments = useCallback(async (debtId: string): Promise<DebtPayment[]> => {
    try {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get debt payments error:', error);
      return [];
    }
  }, []);

  return (
    <CloudDataContext.Provider
      value={{
        addProduct, updateProduct, deleteProduct, getProducts,
        addSale, getSales, deleteSale,
        addExpense, getExpenses, deleteExpense,
        addCustomer, updateCustomer, deleteCustomer, getCustomers,
        addDebt, updateDebt, deleteDebt, getDebts,
        addDebtPayment, getDebtPayments,
        lastSyncTime,
        isRefreshing,
        refreshAllData,
        dataVersion,
      }}
    >
      {children}
    </CloudDataContext.Provider>
  );
}

export function useCloudData() {
  const context = useContext(CloudDataContext);
  if (context === undefined) {
    throw new Error('useCloudData must be used within a CloudDataProvider');
  }
  return context;
}

// Backward compatibility alias
export const useData = useCloudData;
