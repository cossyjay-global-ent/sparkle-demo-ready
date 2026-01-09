/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔒 DATE FILTER CONTEXT - PRODUCTION LOCKED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ NON-NEGOTIABLE RULES - DO NOT MODIFY WITHOUT AUTHORIZATION:
 * 
 * 1. DAILY is the GLOBAL DEFAULT - always initializes to today
 * 2. Staff users are LOCKED to Daily mode - cannot change date range
 * 3. Admins can temporarily change date range - syncs across all devices
 * 4. Real-time sync prevents race conditions and duplicate events
 * 5. Offline → Online always reverts to Daily safely
 * 6. PWA relaunch always starts fresh with Daily
 * 
 * This file is PRODUCTION-LOCKED for Play Store stability.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRBAC } from './RBACContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS - LOCKED
// ═══════════════════════════════════════════════════════════════════════════════

interface DateRange {
  fromDate: Date;
  toDate: Date;
}

interface DateFilterContextType {
  /** Current active date range */
  dateRange: DateRange;
  /** Set date range (Admin only - broadcasts to all devices) */
  setDateRange: (range: DateRange) => void;
  /** Reset to Daily mode (Today) */
  resetToDaily: () => void;
  /** TRUE if current range is today only */
  isDaily: boolean;
  /** TRUE if user can select date ranges (Admin only) */
  canSelectDateRange: boolean;
  /** Sync status for debugging */
  syncStatus: 'connected' | 'connecting' | 'disconnected';
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS - LOCKED
// ═══════════════════════════════════════════════════════════════════════════════

/** Get start of day (00:00:00.000) - IMMUTABLE */
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of day (23:59:59.999) - IMMUTABLE */
function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** 
 * 🔒 NON-NEGOTIABLE: Always returns today's range
 * This is the GLOBAL DEFAULT that MUST be used everywhere
 */
function getTodayRange(): DateRange {
  const today = new Date();
  return {
    fromDate: getStartOfDay(today),
    toDate: getEndOfDay(today)
  };
}

/** Check if two dates are the same calendar day */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/** Validate date range is valid (not corrupted) */
function isValidDateRange(range: DateRange | null | undefined): boolean {
  if (!range) return false;
  if (!(range.fromDate instanceof Date) || !(range.toDate instanceof Date)) return false;
  if (isNaN(range.fromDate.getTime()) || isNaN(range.toDate.getTime())) return false;
  return true;
}

/** Safe date parse with fallback to today */
function safeParseDateRange(fromDate: string, toDate: string): DateRange {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      console.warn('[DateFilter] Invalid dates received, falling back to Daily');
      return getTodayRange();
    }
    return { fromDate: from, toDate: to };
  } catch {
    console.warn('[DateFilter] Date parse error, falling back to Daily');
    return getTodayRange();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT - PRODUCTION LOCKED
// ═══════════════════════════════════════════════════════════════════════════════

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useRBAC();
  const { user } = useAuth();
  
  // 🔒 NON-NEGOTIABLE: ALWAYS initialize with today's range (Daily default)
  const [dateRange, setDateRangeState] = useState<DateRange>(getTodayRange);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // Refs for real-time sync management
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isLocalChange = useRef(false);
  const lastBroadcastTime = useRef<number>(0);
  const mountedRef = useRef(true);

  // Debounce constant to prevent broadcast loops (ms)
  const BROADCAST_DEBOUNCE = 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 DAILY DEFAULT ENFORCEMENT - NON-NEGOTIABLE
  // ═══════════════════════════════════════════════════════════════════════════

  // Reset to daily on EVERY mount/refresh - LOCKED
  useEffect(() => {
    mountedRef.current = true;
    setDateRangeState(getTodayRange());
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset to daily on reconnection - LOCKED
  useEffect(() => {
    const handleOnline = () => {
      if (mountedRef.current) {
        console.log('[DateFilter] Online - resetting to Daily');
        setDateRangeState(getTodayRange());
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Reset to daily on visibility change (PWA relaunch, tab focus) - LOCKED
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        console.log('[DateFilter] Visibility restored - resetting to Daily');
        setDateRangeState(getTodayRange());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Enforce daily for staff users - LOCKED
  useEffect(() => {
    if (!isAdmin && mountedRef.current) {
      setDateRangeState(getTodayRange());
    }
  }, [isAdmin]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔄 REAL-TIME SYNC - ADMIN ONLY - LOCKED
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Only admins can sync date ranges
    if (!user?.id || !isAdmin) {
      setSyncStatus('disconnected');
      return;
    }

    const channelName = `date-filter-sync-${user.id}`;
    
    // Clean up existing channel safely
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.warn('[DateFilter] Channel cleanup warning:', e);
      }
      channelRef.current = null;
    }

    setSyncStatus('connecting');

    // Create broadcast channel for real-time sync
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false } // Don't receive own broadcasts
      }
    });
    
    channel
      .on('broadcast', { event: 'date-range-change' }, (payload) => {
        if (!mountedRef.current) return;
        
        console.log('[DateFilter] Received broadcast:', payload);
        
        // Prevent processing if this was our own change (extra safety)
        const now = Date.now();
        if (isLocalChange.current || (now - lastBroadcastTime.current < BROADCAST_DEBOUNCE)) {
          isLocalChange.current = false;
          return;
        }
        
        // Safely parse and apply received date range
        if (payload.payload?.fromDate && payload.payload?.toDate) {
          const newRange = safeParseDateRange(
            payload.payload.fromDate,
            payload.payload.toDate
          );
          
          if (isValidDateRange(newRange)) {
            setDateRangeState(newRange);
            console.log('[DateFilter] ✓ Synced date range from another device');
          }
        }
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        
        console.log('[DateFilter] Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus('disconnected');
          // On error, ensure we're on Daily
          setDateRangeState(getTodayRange());
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          console.warn('[DateFilter] Cleanup warning:', e);
        }
        channelRef.current = null;
      }
      setSyncStatus('disconnected');
    };
  }, [user?.id, isAdmin]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 ACTIONS - LOCKED
  // ═══════════════════════════════════════════════════════════════════════════

  /** 
   * Reset to Daily mode - broadcasts to all devices
   * 🔒 NON-NEGOTIABLE: This is the global fallback
   */
  const resetToDaily = useCallback(() => {
    const todayRange = getTodayRange();
    setDateRangeState(todayRange);
    
    // Broadcast reset to other devices (admin only)
    if (channelRef.current && isAdmin) {
      const now = Date.now();
      if (now - lastBroadcastTime.current > BROADCAST_DEBOUNCE) {
        isLocalChange.current = true;
        lastBroadcastTime.current = now;
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'date-range-change',
          payload: {
            fromDate: todayRange.fromDate.toISOString(),
            toDate: todayRange.toDate.toISOString()
          }
        }).catch((e) => {
          console.warn('[DateFilter] Broadcast error:', e);
        });
      }
    }
  }, [isAdmin]);

  /** 
   * Set date range - Admin only, broadcasts to all devices
   * 🔒 Staff users are LOCKED to Daily
   */
  const setDateRange = useCallback((range: DateRange) => {
    // 🔒 Staff users can ONLY use daily - NON-NEGOTIABLE
    if (!isAdmin) {
      console.log('[DateFilter] Staff user - enforcing Daily mode');
      setDateRangeState(getTodayRange());
      return;
    }

    // Validate input
    if (!isValidDateRange(range)) {
      console.warn('[DateFilter] Invalid range provided, using Daily');
      setDateRangeState(getTodayRange());
      return;
    }

    const newRange = {
      fromDate: getStartOfDay(range.fromDate),
      toDate: getEndOfDay(range.toDate)
    };

    setDateRangeState(newRange);

    // Broadcast change to other devices for real-time sync
    if (channelRef.current) {
      const now = Date.now();
      if (now - lastBroadcastTime.current > BROADCAST_DEBOUNCE) {
        isLocalChange.current = true;
        lastBroadcastTime.current = now;
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'date-range-change',
          payload: {
            fromDate: newRange.fromDate.toISOString(),
            toDate: newRange.toDate.toISOString()
          }
        }).catch((e) => {
          console.warn('[DateFilter] Broadcast error:', e);
        });
        
        console.log('[DateFilter] ✓ Broadcasted date range change');
      }
    }
  }, [isAdmin]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 COMPUTED VALUES - LOCKED
  // ═══════════════════════════════════════════════════════════════════════════

  /** 
   * isDaily - TRUE only when showing today's data
   * 🔒 This controls the Daily Mode badge visibility
   */
  const isDaily = useMemo(() => {
    const today = new Date();
    return isSameDay(dateRange.fromDate, today) && isSameDay(dateRange.toDate, today);
  }, [dateRange.fromDate, dateRange.toDate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE - MEMOIZED FOR PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════

  const contextValue = useMemo(() => ({
    dateRange,
    setDateRange,
    resetToDaily,
    isDaily,
    canSelectDateRange: isAdmin,
    syncStatus
  }), [dateRange, setDateRange, resetToDaily, isDaily, isAdmin, syncStatus]);

  return (
    <DateFilterContext.Provider value={contextValue}>
      {children}
    </DateFilterContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK - LOCKED
// ═══════════════════════════════════════════════════════════════════════════════

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}
