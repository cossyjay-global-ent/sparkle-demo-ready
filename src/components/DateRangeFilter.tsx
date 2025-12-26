import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDateFilter } from '@/contexts/DateFilterContext';

export function DateRangeFilter() {
  const { dateRange, setDateRange, resetToDaily, isDaily, canSelectDateRange } = useDateFilter();
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
    <div className="date-filter-container">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">FROM</span>
        
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={!canSelectDateRange}
              className={cn(
                "justify-start text-left font-normal min-w-[140px]",
                !dateRange.fromDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.fromDate ? format(dateRange.fromDate, "PPP") : <span>C-A-L-E-N-D-E-R</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.fromDate}
              onSelect={handleFromSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        
        <span className="text-sm font-medium text-muted-foreground">TO</span>

        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={!canSelectDateRange}
              className={cn(
                "justify-start text-left font-normal min-w-[140px]",
                !dateRange.toDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.toDate ? format(dateRange.toDate, "PPP") : <span>C-A-L-E-N-D-E-R</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.toDate}
              onSelect={handleToSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {!isDaily && canSelectDateRange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDaily}
            className="ml-2 text-primary hover:text-primary/80"
          >
            Reset to Today
          </Button>
        )}
      </div>

      {!canSelectDateRange && (
        <p className="text-xs text-muted-foreground mt-2">
          Date range selection is restricted. Showing daily data only.
        </p>
      )}
    </div>
  );
}
