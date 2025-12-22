import Dexie, { Table } from 'dexie';

// Types for our offline-first database
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  profitPasswordHash?: string;
  createdAt: number;
  updatedAt: number;
  lastSyncAt?: number;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  category?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface Sale {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalAmount: number;
  profit: number;
  date: number;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: number;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface Debt {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: number;
  status: 'pending' | 'partial' | 'paid';
  date: number;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface DebtPayment {
  id: string;
  userId: string;
  debtId: string;
  amount: number;
  date: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface SyncLog {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  data: string;
  timestamp: number;
  synced: boolean;
}

export interface AppSettings {
  id: string;
  userId: string;
  profitPasswordSet: boolean;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  currencySymbol: string;
  createdAt: number;
  updatedAt: number;
}

class OfflinePOSDatabase extends Dexie {
  users!: Table<User>;
  products!: Table<Product>;
  sales!: Table<Sale>;
  expenses!: Table<Expense>;
  customers!: Table<Customer>;
  debts!: Table<Debt>;
  debtPayments!: Table<DebtPayment>;
  syncLogs!: Table<SyncLog>;
  appSettings!: Table<AppSettings>;

  constructor() {
    super('OfflinePOSDB');
    
    this.version(1).stores({
      users: 'id, email',
      products: 'id, userId, name, category, syncStatus, [userId+syncStatus]',
      sales: 'id, userId, productId, date, syncStatus, [userId+date], [userId+syncStatus]',
      expenses: 'id, userId, category, date, syncStatus, [userId+date], [userId+syncStatus]',
      customers: 'id, userId, name, phone, syncStatus, [userId+syncStatus]',
      debts: 'id, userId, customerId, status, dueDate, syncStatus, [userId+status], [userId+syncStatus]',
      debtPayments: 'id, userId, debtId, date, syncStatus, [userId+syncStatus]',
      syncLogs: 'id, userId, tableName, recordId, synced, timestamp, [userId+synced]',
      appSettings: 'id, userId'
    });
  }
}

export const db = new OfflinePOSDatabase();

// Helper function to generate UUID
export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}

// Helper function to get current timestamp
export function now(): number {
  return Date.now();
}
