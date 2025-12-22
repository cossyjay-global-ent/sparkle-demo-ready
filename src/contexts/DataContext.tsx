import React, { createContext, useContext, useCallback } from 'react';
import { db, Product, Sale, Expense, Customer, Debt, DebtPayment, generateId, now } from '@/lib/database';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

interface DataContextType {
  // Products
  addProduct: (data: Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Product | null>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProducts: () => Promise<Product[]>;

  // Sales
  addSale: (data: Omit<Sale, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Sale | null>;
  getSales: (startDate?: number, endDate?: number) => Promise<Sale[]>;
  deleteSale: (id: string) => Promise<boolean>;

  // Expenses
  addExpense: (data: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Expense | null>;
  getExpenses: (startDate?: number, endDate?: number) => Promise<Expense[]>;
  deleteExpense: (id: string) => Promise<boolean>;

  // Customers
  addCustomer: (data: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Customer | null>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  getCustomers: () => Promise<Customer[]>;

  // Debts
  addDebt: (data: Omit<Debt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<Debt | null>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;
  getDebts: (startDate?: number, endDate?: number) => Promise<Debt[]>;

  // Debt Payments
  addDebtPayment: (data: Omit<DebtPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<DebtPayment | null>;
  getDebtPayments: (debtId: string) => Promise<DebtPayment[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Products
  const addProduct = useCallback(async (data: Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Product | null> => {
    if (!user) return null;
    try {
      const product: Product = {
        ...data,
        id: generateId(),
        userId: user.id,
        createdAt: now(),
        updatedAt: now(),
        syncStatus: 'pending'
      };
      await db.products.add(product);
      return product;
    } catch (error) {
      console.error('Add product error:', error);
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
      return null;
    }
  }, [user]);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>): Promise<boolean> => {
    try {
      await db.products.update(id, { ...data, updatedAt: now(), syncStatus: 'pending' });
      return true;
    } catch (error) {
      console.error('Update product error:', error);
      return false;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      await db.products.delete(id);
      return true;
    } catch (error) {
      console.error('Delete product error:', error);
      return false;
    }
  }, []);

  const getProducts = useCallback(async (): Promise<Product[]> => {
    if (!user) return [];
    return db.products.where('userId').equals(user.id).toArray();
  }, [user]);

  // Sales
  const addSale = useCallback(async (data: Omit<Sale, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Sale | null> => {
    if (!user) return null;
    try {
      const sale: Sale = {
        ...data,
        id: generateId(),
        userId: user.id,
        createdAt: now(),
        updatedAt: now(),
        syncStatus: 'pending'
      };
      await db.sales.add(sale);

      // Update product stock
      const product = await db.products.get(data.productId);
      if (product) {
        await db.products.update(product.id, {
          stock: Math.max(0, product.stock - data.quantity),
          updatedAt: now(),
          syncStatus: 'pending'
        });
      }

      return sale;
    } catch (error) {
      console.error('Add sale error:', error);
      toast({ title: "Error", description: "Failed to record sale", variant: "destructive" });
      return null;
    }
  }, [user]);

  const getSales = useCallback(async (startDate?: number, endDate?: number): Promise<Sale[]> => {
    if (!user) return [];
    let query = db.sales.where('userId').equals(user.id);
    const sales = await query.toArray();
    
    if (startDate && endDate) {
      return sales.filter(s => s.date >= startDate && s.date <= endDate);
    }
    return sales;
  }, [user]);

  const deleteSale = useCallback(async (id: string): Promise<boolean> => {
    try {
      await db.sales.delete(id);
      return true;
    } catch (error) {
      console.error('Delete sale error:', error);
      return false;
    }
  }, []);

  // Expenses
  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Expense | null> => {
    if (!user) return null;
    try {
      const expense: Expense = {
        ...data,
        id: generateId(),
        userId: user.id,
        createdAt: now(),
        updatedAt: now(),
        syncStatus: 'pending'
      };
      await db.expenses.add(expense);
      return expense;
    } catch (error) {
      console.error('Add expense error:', error);
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
      return null;
    }
  }, [user]);

  const getExpenses = useCallback(async (startDate?: number, endDate?: number): Promise<Expense[]> => {
    if (!user) return [];
    const expenses = await db.expenses.where('userId').equals(user.id).toArray();
    
    if (startDate && endDate) {
      return expenses.filter(e => e.date >= startDate && e.date <= endDate);
    }
    return expenses;
  }, [user]);

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    try {
      await db.expenses.delete(id);
      return true;
    } catch (error) {
      console.error('Delete expense error:', error);
      return false;
    }
  }, []);

  // Customers
  const addCustomer = useCallback(async (data: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Customer | null> => {
    if (!user) return null;
    try {
      const customer: Customer = {
        ...data,
        id: generateId(),
        userId: user.id,
        createdAt: now(),
        updatedAt: now(),
        syncStatus: 'pending'
      };
      await db.customers.add(customer);
      return customer;
    } catch (error) {
      console.error('Add customer error:', error);
      toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
      return null;
    }
  }, [user]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>): Promise<boolean> => {
    try {
      await db.customers.update(id, { ...data, updatedAt: now(), syncStatus: 'pending' });
      return true;
    } catch (error) {
      console.error('Update customer error:', error);
      return false;
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      await db.customers.delete(id);
      return true;
    } catch (error) {
      console.error('Delete customer error:', error);
      return false;
    }
  }, []);

  const getCustomers = useCallback(async (): Promise<Customer[]> => {
    if (!user) return [];
    return db.customers.where('userId').equals(user.id).toArray();
  }, [user]);

  // Debts
  const addDebt = useCallback(async (data: Omit<Debt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Debt | null> => {
    if (!user) return null;
    try {
      const debt: Debt = {
        ...data,
        id: generateId(),
        userId: user.id,
        createdAt: now(),
        updatedAt: now(),
        syncStatus: 'pending'
      };
      await db.debts.add(debt);
      return debt;
    } catch (error) {
      console.error('Add debt error:', error);
      toast({ title: "Error", description: "Failed to add debt", variant: "destructive" });
      return null;
    }
  }, [user]);

  const updateDebt = useCallback(async (id: string, data: Partial<Debt>): Promise<boolean> => {
    try {
      await db.debts.update(id, { ...data, updatedAt: now(), syncStatus: 'pending' });
      return true;
    } catch (error) {
      console.error('Update debt error:', error);
      return false;
    }
  }, []);

  const deleteDebt = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Delete associated payments first
      await db.debtPayments.where('debtId').equals(id).delete();
      await db.debts.delete(id);
      return true;
    } catch (error) {
      console.error('Delete debt error:', error);
      return false;
    }
  }, []);

  const getDebts = useCallback(async (startDate?: number, endDate?: number): Promise<Debt[]> => {
    if (!user) return [];
    const debts = await db.debts.where('userId').equals(user.id).toArray();
    
    if (startDate && endDate) {
      return debts.filter(d => d.date >= startDate && d.date <= endDate);
    }
    return debts;
  }, [user]);

  // Debt Payments
  const addDebtPayment = useCallback(async (data: Omit<DebtPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<DebtPayment | null> => {
    if (!user) return null;
    try {
      const payment: DebtPayment = {
        ...data,
        id: generateId(),
        userId: user.id,
        createdAt: now(),
        updatedAt: now(),
        syncStatus: 'pending'
      };
      await db.debtPayments.add(payment);

      // Update debt paid amount and status
      const debt = await db.debts.get(data.debtId);
      if (debt) {
        const newPaidAmount = debt.paidAmount + data.amount;
        const newStatus = newPaidAmount >= debt.totalAmount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';
        await db.debts.update(debt.id, {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: now(),
          syncStatus: 'pending'
        });
      }

      return payment;
    } catch (error) {
      console.error('Add debt payment error:', error);
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
      return null;
    }
  }, [user]);

  const getDebtPayments = useCallback(async (debtId: string): Promise<DebtPayment[]> => {
    return db.debtPayments.where('debtId').equals(debtId).toArray();
  }, []);

  return (
    <DataContext.Provider
      value={{
        addProduct, updateProduct, deleteProduct, getProducts,
        addSale, getSales, deleteSale,
        addExpense, getExpenses, deleteExpense,
        addCustomer, updateCustomer, deleteCustomer, getCustomers,
        addDebt, updateDebt, deleteDebt, getDebts,
        addDebtPayment, getDebtPayments
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
