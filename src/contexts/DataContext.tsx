import React, { createContext, useContext, useCallback } from 'react';
import { db, Product, Sale, Expense, Customer, Debt, DebtItem, DebtPayment, DeleteQueue, generateId, now } from '@/lib/database';
import { useAuth } from './AuthContext';
import { useRBAC } from './RBACContext';
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
  syncPendingDeletes: () => Promise<void>;

  // Debt Payments
  addDebtPayment: (data: Omit<DebtPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<DebtPayment | null>;
  getDebtPayments: (debtId: string) => Promise<DebtPayment[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, isOnline } = useAuth();
  const { logAction, canDeleteDebt } = useRBAC();

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
      await logAction('create', 'products', product.id, `Created product: ${product.name}`, undefined, product);
      return product;
    } catch (error) {
      console.error('Add product error:', error);
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
      return null;
    }
  }, [user, logAction]);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>): Promise<boolean> => {
    try {
      const existing = await db.products.get(id);
      await db.products.update(id, { ...data, updatedAt: now(), syncStatus: 'pending' });
      await logAction('update', 'products', id, `Updated product`, existing, data);
      return true;
    } catch (error) {
      console.error('Update product error:', error);
      return false;
    }
  }, [logAction]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const existing = await db.products.get(id);
      await db.products.delete(id);
      await logAction('delete', 'products', id, `Deleted product: ${existing?.name}`, existing);
      return true;
    } catch (error) {
      console.error('Delete product error:', error);
      return false;
    }
  }, [logAction]);

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

      // Update product stock only if productId is provided (not manual input)
      if (data.productId) {
        const product = await db.products.get(data.productId);
        if (product) {
          await db.products.update(product.id, {
            stock: Math.max(0, product.stock - data.quantity),
            updatedAt: now(),
            syncStatus: 'pending'
          });
        }
      }

      await logAction('create', 'sales', sale.id, `Sale recorded: ${sale.productName} x${sale.quantity}`, undefined, sale);
      return sale;
    } catch (error) {
      console.error('Add sale error:', error);
      toast({ title: "Error", description: "Failed to record sale", variant: "destructive" });
      return null;
    }
  }, [user, logAction]);

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
      const existing = await db.sales.get(id);
      await db.sales.delete(id);
      await logAction('delete', 'sales', id, `Deleted sale: ${existing?.productName}`, existing);
      return true;
    } catch (error) {
      console.error('Delete sale error:', error);
      return false;
    }
  }, [logAction]);

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
      await logAction('create', 'expenses', expense.id, `Expense added: ${expense.description}`, undefined, expense);
      return expense;
    } catch (error) {
      console.error('Add expense error:', error);
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
      return null;
    }
  }, [user, logAction]);

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
      const existing = await db.expenses.get(id);
      await db.expenses.delete(id);
      await logAction('delete', 'expenses', id, `Deleted expense: ${existing?.description}`, existing);
      return true;
    } catch (error) {
      console.error('Delete expense error:', error);
      return false;
    }
  }, [logAction]);

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
      await logAction('create', 'customers', customer.id, `Customer added: ${customer.name}`, undefined, customer);
      return customer;
    } catch (error) {
      console.error('Add customer error:', error);
      toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
      return null;
    }
  }, [user, logAction]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>): Promise<boolean> => {
    try {
      const existing = await db.customers.get(id);
      await db.customers.update(id, { ...data, updatedAt: now(), syncStatus: 'pending' });
      await logAction('update', 'customers', id, `Updated customer`, existing, data);
      return true;
    } catch (error) {
      console.error('Update customer error:', error);
      return false;
    }
  }, [logAction]);

  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      const existing = await db.customers.get(id);
      await db.customers.delete(id);
      await logAction('delete', 'customers', id, `Deleted customer: ${existing?.name}`, existing);
      return true;
    } catch (error) {
      console.error('Delete customer error:', error);
      return false;
    }
  }, [logAction]);

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
        deleteStatus: 'active',
        createdAt: now(),
        updatedAt: now(),
        syncStatus: 'pending'
      };
      await db.debts.add(debt);
      await logAction('create', 'debts', debt.id, `Debt created for: ${debt.customerName} - ₦${debt.totalAmount}`, undefined, debt);
      return debt;
    } catch (error) {
      console.error('Add debt error:', error);
      toast({ title: "Error", description: "Failed to add debt", variant: "destructive" });
      return null;
    }
  }, [user, logAction]);

  const updateDebt = useCallback(async (id: string, data: Partial<Debt>): Promise<boolean> => {
    try {
      const existing = await db.debts.get(id);
      await db.debts.update(id, { ...data, updatedAt: now(), syncStatus: 'pending' });
      await logAction('update', 'debts', id, `Updated debt for: ${existing?.customerName}`, existing, data);
      return true;
    } catch (error) {
      console.error('Update debt error:', error);
      return false;
    }
  }, [logAction]);

  // Offline-safe delete - marks as pending_delete when offline
  const deleteDebt = useCallback(async (id: string): Promise<boolean> => {
    if (!canDeleteDebt) {
      toast({ title: "Access Denied", description: "You don't have permission to delete debts", variant: "destructive" });
      return false;
    }

    try {
      const existing = await db.debts.get(id);
      if (!existing) return false;

      if (isOnline) {
        // Online: delete immediately
        await db.debtPayments.where('debtId').equals(id).delete();
        await db.debts.delete(id);
        await logAction('delete', 'debts', id, `Permanently deleted debt for: ${existing.customerName}`, existing);
      } else {
        // Offline: mark as pending_delete and queue for sync
        await db.debts.update(id, {
          deleteStatus: 'pending_delete',
          updatedAt: now(),
          syncStatus: 'pending'
        });

        // Add to delete queue
        const queueItem: DeleteQueue = {
          id: generateId(),
          userId: user?.id || '',
          tableName: 'debts',
          recordId: id,
          data: JSON.stringify(existing),
          queuedAt: now(),
          syncStatus: 'pending'
        };
        await db.deleteQueue.add(queueItem);

        await logAction('delete', 'debts', id, `Queued deletion (offline) for: ${existing.customerName}`, existing);
      }
      
      return true;
    } catch (error) {
      console.error('Delete debt error:', error);
      return false;
    }
  }, [user, isOnline, canDeleteDebt, logAction]);

  // Sync pending deletes when online
  const syncPendingDeletes = useCallback(async (): Promise<void> => {
    if (!isOnline || !user) return;

    try {
      const pendingDeletes = await db.deleteQueue
        .where('syncStatus')
        .equals('pending')
        .toArray();

      for (const item of pendingDeletes) {
        if (item.tableName === 'debts') {
          // Delete associated payments
          await db.debtPayments.where('debtId').equals(item.recordId).delete();
          // Delete the debt
          await db.debts.delete(item.recordId);
          // Mark queue item as synced
          await db.deleteQueue.update(item.id, { syncStatus: 'synced' });
          await logAction('sync', 'debts', item.recordId, `Synced deletion for queued debt`);
        }
      }
    } catch (error) {
      console.error('Sync pending deletes error:', error);
    }
  }, [user, isOnline, logAction]);

  const getDebts = useCallback(async (startDate?: number, endDate?: number): Promise<Debt[]> => {
    if (!user) return [];
    // Filter out pending_delete debts from display
    const debts = await db.debts.where('userId').equals(user.id).toArray();
    const activeDebts = debts.filter(d => d.deleteStatus !== 'pending_delete');
    
    if (startDate && endDate) {
      return activeDebts.filter(d => d.date >= startDate && d.date <= endDate);
    }
    return activeDebts;
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

      await logAction('payment', 'debt_payments', payment.id, `Payment of ₦${data.amount} recorded for debt`, undefined, payment);
      return payment;
    } catch (error) {
      console.error('Add debt payment error:', error);
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
      return null;
    }
  }, [user, logAction]);

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
        addDebt, updateDebt, deleteDebt, getDebts, syncPendingDeletes,
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
