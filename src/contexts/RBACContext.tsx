import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, UserRole, AuditLog, AppRole, generateId, now } from '@/lib/database';
import { useAuth } from './AuthContext';

interface RBACContextType {
  role: AppRole | null;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
  canDeleteDebt: boolean;
  canViewProfit: boolean;
  canViewAuditLogs: boolean;
  setUserRole: (userId: string, role: AppRole, assignedBy?: string) => Promise<boolean>;
  logAction: (action: AuditLog['action'], tableName: string, recordId: string, description: string, previousData?: any, newData?: any) => Promise<void>;
  getAuditLogs: () => Promise<AuditLog[]>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const { user, isOnline } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user role
  useEffect(() => {
    const loadRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const userRole = await db.userRoles.where('userId').equals(user.id).first();
        
        if (userRole) {
          setRole(userRole.role);
        } else {
          // First user becomes admin, others become staff
          const allRoles = await db.userRoles.count();
          const defaultRole: AppRole = allRoles === 0 ? 'admin' : 'staff';
          
          // Create role for new user
          await db.userRoles.add({
            id: generateId(),
            userId: user.id,
            role: defaultRole,
            createdAt: now(),
            updatedAt: now(),
            syncStatus: 'pending'
          });
          
          setRole(defaultRole);
        }
      } catch (error) {
        console.error('Error loading role:', error);
        setRole('staff'); // Default to staff on error
      } finally {
        setIsLoading(false);
      }
    };

    loadRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';

  // Permission checks
  const canDeleteDebt = isAdmin;
  const canViewProfit = isAdmin;
  const canViewAuditLogs = isAdmin;

  const setUserRole = useCallback(async (userId: string, newRole: AppRole, assignedBy?: string): Promise<boolean> => {
    try {
      const existingRole = await db.userRoles.where('userId').equals(userId).first();
      
      if (existingRole) {
        const oldRole = existingRole.role;
        await db.userRoles.update(existingRole.id, {
          role: newRole,
          assignedBy,
          updatedAt: now(),
          syncStatus: 'pending'
        });

        // Log role change
        if (user) {
          await logAction('role_change', 'user_roles', userId, 
            `Role changed from ${oldRole} to ${newRole}`,
            { role: oldRole },
            { role: newRole }
          );
        }
      } else {
        await db.userRoles.add({
          id: generateId(),
          userId,
          role: newRole,
          assignedBy,
          createdAt: now(),
          updatedAt: now(),
          syncStatus: 'pending'
        });
      }

      if (userId === user?.id) {
        setRole(newRole);
      }

      return true;
    } catch (error) {
      console.error('Error setting role:', error);
      return false;
    }
  }, [user]);

  const logAction = useCallback(async (
    action: AuditLog['action'],
    tableName: string,
    recordId: string,
    description: string,
    previousData?: any,
    newData?: any
  ): Promise<void> => {
    if (!user) return;

    try {
      const log: AuditLog = {
        id: generateId(),
        userId: user.id,
        userEmail: user.email,
        userRole: role || 'staff',
        action,
        tableName,
        recordId,
        description,
        previousData: previousData ? JSON.stringify(previousData) : undefined,
        newData: newData ? JSON.stringify(newData) : undefined,
        mode: isOnline ? 'online' : 'offline',
        timestamp: now(),
        syncStatus: 'pending'
      };

      await db.auditLogs.add(log);
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }, [user, role, isOnline]);

  const getAuditLogs = useCallback(async (): Promise<AuditLog[]> => {
    if (!isAdmin) return [];
    
    try {
      return await db.auditLogs.orderBy('timestamp').reverse().toArray();
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }, [isAdmin]);

  return (
    <RBACContext.Provider
      value={{
        role,
        isAdmin,
        isStaff,
        isLoading,
        canDeleteDebt,
        canViewProfit,
        canViewAuditLogs,
        setUserRole,
        logAction,
        getAuditLogs
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within a RBACProvider');
  }
  return context;
}