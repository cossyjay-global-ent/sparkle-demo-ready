import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRBAC } from './RBACContext';

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
  
  // NON-NEGOTIABLE: ALWAYS initialize with today's range (Daily default)
  // This ensures all devices start with daily - synchronized by default
  const [dateRange, setDateRangeState] = useState<DateRange>(getTodayRange);

  // NON-NEGOTIABLE: Reset to daily on EVERY mount/refresh
  // This ensures synchronization across all devices - all start fresh with daily
  useEffect(() => {
    setDateRangeState(getTodayRange());
  }, []);

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
        // Always reset to daily when app becomes visible
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
    setDateRangeState(getTodayRange());
  }, []);

  // Admin can temporarily change date range within current session only
  // On any refresh/reload/device change, it resets to daily (synchronized behavior)
  const setDateRange = useCallback((range: DateRange) => {
    // Staff users can only use daily - NON-NEGOTIABLE
    if (!isAdmin) {
      setDateRangeState(getTodayRange());
      return;
    }

    // Admin can change within session, but NO persistence
    // This ensures all devices always start with daily (synchronized)
    setDateRangeState({
      fromDate: getStartOfDay(range.fromDate),
      toDate: getEndOfDay(range.toDate)
    });
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
