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

const DATE_FILTER_STORAGE_KEY = 'offline-pos-date-filter';

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
  // ALWAYS initialize with today's range (Daily default)
  const [dateRange, setDateRangeState] = useState<DateRange>(getTodayRange);

  // Reset to daily on mount - ALWAYS enforce daily on app load/refresh
  useEffect(() => {
    const todayRange = getTodayRange();
    setDateRangeState(todayRange);
    try {
      localStorage.setItem(DATE_FILTER_STORAGE_KEY, JSON.stringify({
        fromDate: todayRange.fromDate.toISOString(),
        toDate: todayRange.toDate.toISOString()
      }));
    } catch (error) {
      console.error('Error saving date filter on mount:', error);
    }
  }, []);

  // Listen for online/offline changes and reset to daily on reconnection
  useEffect(() => {
    const handleOnline = () => {
      // Reset to daily on reconnection for consistency
      const todayRange = getTodayRange();
      setDateRangeState(todayRange);
      try {
        localStorage.setItem(DATE_FILTER_STORAGE_KEY, JSON.stringify({
          fromDate: todayRange.fromDate.toISOString(),
          toDate: todayRange.toDate.toISOString()
        }));
      } catch (error) {
        console.error('Error saving date filter on reconnection:', error);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Listen for visibility change (PWA relaunch) and enforce daily
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if it's a new day since last visit
        const stored = localStorage.getItem(DATE_FILTER_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const storedFrom = new Date(parsed.fromDate);
            const today = new Date();
            // If stored date is not today, reset to daily
            if (!isSameDay(storedFrom, today)) {
              const todayRange = getTodayRange();
              setDateRangeState(todayRange);
              localStorage.setItem(DATE_FILTER_STORAGE_KEY, JSON.stringify({
                fromDate: todayRange.fromDate.toISOString(),
                toDate: todayRange.toDate.toISOString()
              }));
            }
          } catch (error) {
            // If error, reset to daily
            const todayRange = getTodayRange();
            setDateRangeState(todayRange);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Enforce daily for staff users whenever isAdmin changes
  useEffect(() => {
    if (!isAdmin) {
      const todayRange = getTodayRange();
      setDateRangeState(todayRange);
      try {
        localStorage.setItem(DATE_FILTER_STORAGE_KEY, JSON.stringify({
          fromDate: todayRange.fromDate.toISOString(),
          toDate: todayRange.toDate.toISOString()
        }));
      } catch (error) {
        console.error('Error enforcing daily for staff:', error);
      }
    }
  }, [isAdmin]);

  const resetToDaily = useCallback(() => {
    const todayRange = getTodayRange();
    setDateRangeState(todayRange);
    try {
      localStorage.setItem(DATE_FILTER_STORAGE_KEY, JSON.stringify({
        fromDate: todayRange.fromDate.toISOString(),
        toDate: todayRange.toDate.toISOString()
      }));
    } catch (error) {
      console.error('Error saving date filter:', error);
    }
  }, []);

  const setDateRange = useCallback((range: DateRange) => {
    // Staff users can only use daily
    if (!isAdmin) {
      resetToDaily();
      return;
    }

    const newRange = {
      fromDate: getStartOfDay(range.fromDate),
      toDate: getEndOfDay(range.toDate)
    };

    setDateRangeState(newRange);
    try {
      localStorage.setItem(DATE_FILTER_STORAGE_KEY, JSON.stringify({
        fromDate: newRange.fromDate.toISOString(),
        toDate: newRange.toDate.toISOString()
      }));
    } catch (error) {
      console.error('Error saving date filter:', error);
    }
  }, [isAdmin, resetToDaily]);

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
