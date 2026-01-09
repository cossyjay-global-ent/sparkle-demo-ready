/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔒 DATE RANGE FILTER - PRODUCTION LOCKED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ NON-NEGOTIABLE RULES:
 * 
 * 1. "Daily Mode" badge MUST appear when isDaily is TRUE
 * 2. Badge MUST disappear immediately when non-Daily range selected
 * 3. Badge is NOT clickable - display only
 * 4. Staff users see disabled date pickers
 * 5. Consistent across all routes, reloads, and PWA states
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, memo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowRight, Clock, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDateFilter } from '@/contexts/DateFilterContext';

/**
 * 🔒 DAILY MODE BADGE - LOCKED COMPONENT
 * Displays only when in Daily mode, not clickable
 */
const DailyModeBadge = memo(function DailyModeBadge({ 
  isVisible, 
  syncStatus 
}: { 
  isVisible: boolean;
  syncStatus: 'connected' | 'connecting' | 'disconnected';
}) {
  if (!isVisible) return null;

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "bg-primary/10 text-primary border-primary/20 font-medium gap-1.5",
        "animate-in fade-in duration-300 cursor-default select-none",
        "pointer-events-none" // 🔒 NOT CLICKABLE
      )}
      aria-label="Daily Mode Active"
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      <span>Daily Mode</span>
      {/* Sync indicator for admins */}
      {syncStatus === 'connected' && (
        <Wifi className="h-3 w-3 text-green-600" aria-label="Synced" />
      )}
      {syncStatus === 'connecting' && (
        <Wifi className="h-3 w-3 text-yellow-600 animate-pulse" aria-label="Connecting" />
      )}
      {syncStatus === 'disconnected' && (
        <WifiOff className="h-3 w-3 text-muted-foreground" aria-label="Offline" />
      )}
    </Badge>
  );
});

/**
 * 🔒 DATE RANGE FILTER - MAIN COMPONENT
 * Production-locked for Play Store stability
 */
export const DateRangeFilter = memo(function DateRangeFilter() {
  const { 
    dateRange, 
    setDateRange, 
    resetToDaily, 
    isDaily, 
    canSelectDateRange,
    syncStatus 
  } = useDateFilter();
  
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const handleFromSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange({
        fromDate: date,
        toDate: dateRange.toDate < date ? date : dateRange.toDate
      });
      setFromOpen(false);
    }
  };

  const handleToSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange({
        fromDate: dateRange.fromDate > date ? date : dateRange.fromDate,
        toDate: date
      });
      setToOpen(false);
    }
  };

  return (
    <div className="date-filter-container" role="region" aria-label="Date Range Filter">
      <div className="flex flex-wrap items-center gap-2">
        {/* 🔒 DAILY MODE BADGE - Locked visibility logic */}
        <DailyModeBadge isVisible={isDaily} syncStatus={syncStatus} />

        <span className="text-sm font-medium text-muted-foreground">FROM</span>
        
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={!canSelectDateRange}
              className={cn(
                "justify-start text-left font-normal min-w-[140px]",
                !dateRange.fromDate && "text-muted-foreground",
                !canSelectDateRange && "opacity-60 cursor-not-allowed"
              )}
              aria-label={`From date: ${dateRange.fromDate ? format(dateRange.fromDate, "PPP") : "Select date"}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {dateRange.fromDate ? format(dateRange.fromDate, "PPP") : <span>Select date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={dateRange.fromDate}
              onSelect={handleFromSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        
        <span className="text-sm font-medium text-muted-foreground">TO</span>

        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={!canSelectDateRange}
              className={cn(
                "justify-start text-left font-normal min-w-[140px]",
                !dateRange.toDate && "text-muted-foreground",
                !canSelectDateRange && "opacity-60 cursor-not-allowed"
              )}
              aria-label={`To date: ${dateRange.toDate ? format(dateRange.toDate, "PPP") : "Select date"}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {dateRange.toDate ? format(dateRange.toDate, "PPP") : <span>Select date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={dateRange.toDate}
              onSelect={handleToSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Reset button - only visible when NOT in Daily mode AND user is admin */}
        {!isDaily && canSelectDateRange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDaily}
            className="ml-2 text-primary hover:text-primary/80 font-medium"
            aria-label="Reset to today's date"
          >
            Reset to Today
          </Button>
        )}
      </div>

      {/* Staff restriction notice */}
      {!canSelectDateRange && (
        <p className="text-xs text-muted-foreground mt-2" role="note">
          Date range selection is restricted. Showing daily data only.
        </p>
      )}
    </div>
  );
});

export default DateRangeFilter;
