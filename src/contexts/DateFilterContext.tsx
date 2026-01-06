import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRBAC } from './RBACContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DateRange {
  fromDate: Date;
  toDate: Date;
}

interface DateFilterContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  resetToDaily: () => void;
  isDaily: boolean;
  canSelectDateRange: boolean;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// NON-NEGOTIABLE: Always returns today's range - this is the GLOBAL DEFAULT
function getTodayRange(): DateRange {
  const today = new Date();
  return {
    fromDate: getStartOfDay(today),
    toDate: getEndOfDay(today)
  };
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useRBAC();
  const { user } = useAuth();
  
  // NON-NEGOTIABLE: ALWAYS initialize with today's range (Daily default)
  const [dateRange, setDateRangeState] = useState<DateRange>(getTodayRange);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isLocalChange = useRef(false);

  // NON-NEGOTIABLE: Reset to daily on EVERY mount/refresh
  useEffect(() => {
    setDateRangeState(getTodayRange());
  }, []);

  // Real-time sync for admin date range changes across devices
  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    const channelName = `date-filter-${user.id}`;
    
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create broadcast channel for real-time sync
    const channel = supabase.channel(channelName);
    
    channel
      .on('broadcast', { event: 'date-range-change' }, (payload) => {
        console.log('[DateFilter] Received broadcast:', payload);
        
        // Only update if this is from another device (not our own change)
        if (!isLocalChange.current && payload.payload) {
          const { fromDate, toDate } = payload.payload;
          if (fromDate && toDate) {
            setDateRangeState({
              fromDate: new Date(fromDate),
              toDate: new Date(toDate)
            });
            console.log('[DateFilter] Synced date range from another device');
          }
        }
        isLocalChange.current = false;
      })
      .subscribe((status) => {
        console.log('[DateFilter] Channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, isAdmin]);

  // NON-NEGOTIABLE: Reset to daily on reconnection
  useEffect(() => {
    const handleOnline = () => {
      setDateRangeState(getTodayRange());
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // NON-NEGOTIABLE: Reset to daily on visibility change (PWA relaunch, tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setDateRangeState(getTodayRange());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // NON-NEGOTIABLE: Enforce daily for staff users
  useEffect(() => {
    if (!isAdmin) {
      setDateRangeState(getTodayRange());
    }
  }, [isAdmin]);

  // NON-NEGOTIABLE: Reset to daily - used by components
  const resetToDaily = useCallback(() => {
    const todayRange = getTodayRange();
    setDateRangeState(todayRange);
    
    // Broadcast reset to other devices
    if (channelRef.current && isAdmin) {
      isLocalChange.current = true;
      channelRef.current.send({
        type: 'broadcast',
        event: 'date-range-change',
        payload: {
          fromDate: todayRange.fromDate.toISOString(),
          toDate: todayRange.toDate.toISOString()
        }
      });
    }
  }, [isAdmin]);

  // Admin can temporarily change date range - syncs across devices in real-time
  const setDateRange = useCallback((range: DateRange) => {
    // Staff users can only use daily - NON-NEGOTIABLE
    if (!isAdmin) {
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
      isLocalChange.current = true;
      channelRef.current.send({
        type: 'broadcast',
        event: 'date-range-change',
        payload: {
          fromDate: newRange.fromDate.toISOString(),
          toDate: newRange.toDate.toISOString()
        }
      });
      console.log('[DateFilter] Broadcasted date range change');
    }
  }, [isAdmin]);

  const today = new Date();
  const isDaily = isSameDay(dateRange.fromDate, today) && isSameDay(dateRange.toDate, today);

  return (
    <DateFilterContext.Provider
      value={{
        dateRange,
        setDateRange,
        resetToDaily,
        isDaily,
        canSelectDateRange: isAdmin
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}
