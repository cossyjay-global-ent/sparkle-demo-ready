/**
 * ROLE-BASED ACCESS CONTROL (RBAC) CONTEXT
 * Manages user roles and permissions.
 * 
 * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE – NON-NEGOTIABLE
 * Email: support@cosmas.dev has permanent admin access.
 * This override is enforced and cannot be bypassed.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// DEVELOPER LIFETIME ACCESS – DO NOT REMOVE – NON-NEGOTIABLE
const DEVELOPER_EMAIL = 'support@cosmas.dev';

type AppRole = 'admin' | 'staff';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: AppRole;
  action: string;
  tableName: string;
  recordId: string;
  description: string;
  previousData?: string;
  newData?: string;
  mode: string;
  timestamp: string;
}

interface RBACContextType {
  role: AppRole | null;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
  isDeveloper: boolean;
  canDeleteDebt: boolean;
  canViewProfit: boolean;
  canViewAuditLogs: boolean;
  setUserRole: (userId: string, role: AppRole, assignedBy?: string) => Promise<boolean>;
  logAction: (action: string, tableName: string, recordId: string, description: string, previousData?: any, newData?: any) => Promise<void>;
  getAuditLogs: () => Promise<AuditLog[]>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const { user, isOnline } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
   * Check if current user is the developer account
   */
  const isDeveloper = user?.email?.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();

  // Load user role from Supabase
  useEffect(() => {
    const loadRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      /**
       * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
       * Developer always gets admin role
       */
      if (isDeveloper) {
        setRole('admin');
        setIsLoading(false);
        return;
      }

      try {
        // Check for existing role in Supabase
        const { data: userRole, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching role:', error);
          // Default to admin for now to ensure access
          setRole('admin');
          setIsLoading(false);
          return;
        }

        if (userRole) {
          setRole(userRole.role as AppRole);
        } else {
          // First user becomes admin, others become staff
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true });

          const defaultRole: AppRole = (count === 0 || count === null) ? 'admin' : 'staff';

          // Create role for new user
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: defaultRole
            });

          if (insertError) {
            console.error('Error inserting role:', insertError);
            // Default to admin to ensure access
            setRole('admin');
          } else {
            setRole(defaultRole);
          }
        }
      } catch (error) {
        console.error('Error loading role:', error);
        setRole('admin'); // Default to admin on error to ensure access
      } finally {
        setIsLoading(false);
      }
    };

    loadRole();
  }, [user, isDeveloper]);

  /**
   * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
   * Developer always has admin permissions
   */
  const isAdmin = isDeveloper || role === 'admin';
  const isStaff = !isAdmin && role === 'staff';

  // Permission checks - Developer has all permissions
  const canDeleteDebt = isDeveloper || isAdmin;
  const canViewProfit = isDeveloper || isAdmin;
  const canViewAuditLogs = isDeveloper || isAdmin;

  const setUserRole = useCallback(async (userId: string, newRole: AppRole, assignedBy?: string): Promise<boolean> => {
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingRole) {
        const oldRole = existingRole.role;
        const { error } = await supabase
          .from('user_roles')
          .update({
            role: newRole,
            assigned_by: assignedBy
          })
          .eq('user_id', userId);

        if (error) throw error;

        // Log role change
        if (user) {
          await logAction('role_change', 'user_roles', userId, 
            `Role changed from ${oldRole} to ${newRole}`,
            { role: oldRole },
            { role: newRole }
          );
        }
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: newRole,
            assigned_by: assignedBy
          });

        if (error) throw error;
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
    action: string,
    tableName: string,
    recordId: string,
    description: string,
    previousData?: any,
    newData?: any
  ): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          user_role: role || 'staff',
          action,
          table_name: tableName,
          record_id: recordId,
          description,
          previous_data: previousData ? previousData : null,
          new_data: newData ? newData : null,
          mode: isOnline ? 'online' : 'offline'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }, [user, role, isOnline]);

  const getAuditLogs = useCallback(async (): Promise<AuditLog[]> => {
    // DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
    if (!isDeveloper && !isAdmin) return [];
    
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        userEmail: log.user_email,
        userRole: log.user_role as AppRole,
        action: log.action,
        tableName: log.table_name,
        recordId: log.record_id,
        description: log.description,
        previousData: log.previous_data ? JSON.stringify(log.previous_data) : undefined,
        newData: log.new_data ? JSON.stringify(log.new_data) : undefined,
        mode: log.mode,
        timestamp: log.created_at
      }));
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }, [isDeveloper, isAdmin]);

  return (
    <RBACContext.Provider
      value={{
        role,
        isAdmin,
        isStaff,
        isLoading,
        isDeveloper,
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