/**
 * SUBSCRIPTION SYSTEM - PRODUCTION READY
 * Handles subscription state, plan gating, and real-time sync.
 * 
 * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
 * Email: cossybest24@gmail.com has PERMANENT admin access.
 * This override is enforced server-side and cannot be bypassed.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
const DEVELOPER_EMAIL = 'cossybest24@gmail.com';

export type SubscriptionPlan = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled';

interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isLoading: boolean;
  
  // Plan checks
  isFree: boolean;
  isPro: boolean;
  isBusiness: boolean;
  isAdmin: boolean; // Alias for business plan (admin plan)
  
  // Feature access
  canAccessProfit: boolean;
  canAccessReports: boolean;
  canAccessAuditLogs: boolean;
  canAccessHistoricalData: boolean;
  canAccessRoleManagement: boolean;
  
  // Developer override status
  isDeveloper: boolean;
  
  // Actions
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
   * Check if current user is the developer account
   */
  const isDeveloper = user?.email?.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();

  // Fetch subscription from Supabase
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }

      if (data) {
        setSubscription(data as Subscription);
      } else {
        // Create default free subscription for new users
        // DEVELOPER LIFETIME ACCESS – DO NOT REMOVE: Developer gets business plan
        const defaultPlan: SubscriptionPlan = isDeveloper ? 'business' : 'free';
        
        const { data: newSub, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan: defaultPlan,
            status: 'active',
            expires_at: isDeveloper ? null : null // Developer never expires
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating subscription:', insertError);
        } else {
          setSubscription(newSub as Subscription);
        }
      }
    } catch (error) {
      console.error('Error in subscription fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isDeveloper]);

  // Initial load
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Real-time subscription sync across devices
  useEffect(() => {
    if (!user) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`subscription-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Subscription] Realtime update:', payload);
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              setSubscription(payload.new as Subscription);
            } else if (payload.eventType === 'DELETE') {
              setSubscription(null);
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  /**
   * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
   * Resolve effective plan - developer always gets admin/business
   */
  const effectivePlan: SubscriptionPlan = isDeveloper 
    ? 'business' 
    : (subscription?.plan || 'free');

  const effectiveStatus: SubscriptionStatus = isDeveloper 
    ? 'active' 
    : (subscription?.status || 'active');

  // Plan checks
  const isFree = effectivePlan === 'free';
  const isPro = effectivePlan === 'pro' || effectivePlan === 'business';
  const isBusiness = effectivePlan === 'business';
  const isAdmin = isBusiness; // Admin plan = business plan

  /**
   * Feature access based on plan
   * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE: Developer has all access
   */
  const canAccessProfit = isDeveloper || isPro || isBusiness;
  const canAccessReports = isDeveloper || isPro || isBusiness;
  const canAccessHistoricalData = isDeveloper || isPro || isBusiness;
  const canAccessAuditLogs = isDeveloper || isBusiness;
  const canAccessRoleManagement = isDeveloper || isBusiness;

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan: effectivePlan,
        status: effectiveStatus,
        isLoading,
        isFree,
        isPro,
        isBusiness,
        isAdmin,
        canAccessProfit,
        canAccessReports,
        canAccessAuditLogs,
        canAccessHistoricalData,
        canAccessRoleManagement,
        isDeveloper,
        refreshSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
