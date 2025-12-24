import Dexie, { Table } from 'dexie';

// Types for our offline-first database
export type AppRole = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  profitPasswordHash?: string;
  createdAt: number;
  updatedAt: number;
  lastSyncAt?: number;
}

export interface UserRole {
  id: string;
  userId: string;
  role: AppRole;
  assignedBy?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: AppRole;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'role_change' | 'payment' | 'sync';
  tableName: string;
  recordId: string;
  description: string;
  previousData?: string;
  newData?: string;
  mode: 'online' | 'offline';
  timestamp: number;
  syncStatus: 'pending' | 'synced';
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

export interface DebtItem {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
  date: number;
}

export interface Debt {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  description: string;
  items: DebtItem[];
  totalAmount: number;
  paidAmount: number;
  dueDate?: number;
  status: 'pending' | 'partial' | 'paid';
  deleteStatus?: 'active' | 'pending_delete';
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
  description?: string;
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

export interface DeleteQueue {
  id: string;
  userId: string;
  tableName: string;
  recordId: string;
  data: string;
  queuedAt: number;
  syncStatus: 'pending' | 'synced' | 'failed';
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
  userRoles!: Table<UserRole>;
  auditLogs!: Table<AuditLog>;
  products!: Table<Product>;
  sales!: Table<Sale>;
  expenses!: Table<Expense>;
  customers!: Table<Customer>;
  debts!: Table<Debt>;
  debtPayments!: Table<DebtPayment>;
  syncLogs!: Table<SyncLog>;
  deleteQueue!: Table<DeleteQueue>;
  appSettings!: Table<AppSettings>;

  constructor() {
    super('OfflinePOSDB');
    
    this.version(2).stores({
      users: 'id, email',
      userRoles: 'id, userId, role, [userId+role]',
      auditLogs: 'id, userId, action, tableName, timestamp, syncStatus, [userId+syncStatus]',
      products: 'id, userId, name, category, syncStatus, [userId+syncStatus]',
      sales: 'id, userId, productId, date, syncStatus, [userId+date], [userId+syncStatus]',
      expenses: 'id, userId, category, date, syncStatus, [userId+date], [userId+syncStatus]',
      customers: 'id, userId, name, phone, syncStatus, [userId+syncStatus]',
      debts: 'id, userId, customerId, status, deleteStatus, dueDate, syncStatus, [userId+status], [userId+syncStatus], [userId+deleteStatus]',
      debtPayments: 'id, userId, debtId, date, syncStatus, [userId+syncStatus]',
      syncLogs: 'id, userId, tableName, recordId, synced, timestamp, [userId+synced]',
      deleteQueue: 'id, userId, tableName, recordId, syncStatus, [userId+syncStatus]',
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
