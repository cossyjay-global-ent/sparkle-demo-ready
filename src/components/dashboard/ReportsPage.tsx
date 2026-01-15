/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔒 REPORTS PAGE - PRODUCTION LOCKED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ NON-NEGOTIABLE RULES - DO NOT MODIFY WITHOUT AUTHORIZATION:
 * 
 * 1. DAILY is the DEFAULT - uses global DateFilterContext
 * 2. Aligns with Dashboard, Profit, Sales, Expenses pages
 * 3. No local date state - single source of truth
 * 4. Admin real-time sync propagates correctly
 * 
 * This file is PRODUCTION-LOCKED for Play Store stability.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Sale, Expense, Debt } from '@/lib/database';
import { DateRangeFilter } from '@/components/DateRangeFilter';

export default function ReportsPage() {
  const { getSales, getExpenses, getDebts } = useData();
  const { currency } = useCurrency();
  const { dateRange, isDaily, resetToDaily, syncStatus, canSelectDateRange } = useDateFilter();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allDebts, setAllDebts] = useState<Debt[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 RACE-SAFE STATE MACHINE - ALIGNED WITH GLOBAL DATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  
  const stateRef = useRef({
    mounted: true,
    initialized: false
  });

  const currencySymbol = currency.symbol;

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 INITIALIZATION - ALIGNED WITH GLOBAL DAILY LOCK
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    stateRef.current.mounted = true;
    stateRef.current.initialized = true;
    
    return () => {
      stateRef.current.mounted = false;
    };
  }, []);

  // Load data when date range changes
  useEffect(() => {
    if (stateRef.current.mounted) {
      loadData();
    }
  }, [dateRange]);

  const loadData = useCallback(async () => {
    const [salesData, expensesData, debtsData] = await Promise.all([
      getSales(),
      getExpenses(),
      getDebts()
    ]);

    if (stateRef.current.mounted) {
      setAllSales(salesData);
      setAllExpenses(expensesData);
      setAllDebts(debtsData);
    }
  }, [getSales, getExpenses, getDebts]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 DATA FILTERING - ALIGNED WITH GLOBAL DATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  const fromTimestamp = dateRange.fromDate.getTime();
  const toTimestamp = dateRange.toDate.getTime();

  // Filter data by selected date range
  const sales = useMemo(() => {
    return allSales.filter(s => s.date >= fromTimestamp && s.date <= toTimestamp);
  }, [allSales, fromTimestamp, toTimestamp]);

  const expenses = useMemo(() => {
    return allExpenses.filter(e => e.date >= fromTimestamp && e.date <= toTimestamp);
  }, [allExpenses, fromTimestamp, toTimestamp]);

  const debts = useMemo(() => {
    return allDebts.filter(d => d.date >= fromTimestamp && d.date <= toTimestamp);
  }, [allDebts, fromTimestamp, toTimestamp]);

  // Calculate totals
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalOutstanding = totalDebts - totalPaid;

  // Group by date/week/month
  const groupData = (data: { date: number; amount?: number; totalAmount?: number }[], key: 'daily' | 'weekly' | 'monthly') => {
    const grouped: Record<string, { sales: number; expenses: number }> = {};
    
    data.forEach(item => {
      const date = new Date(item.date);
      let groupKey: string;
      
      if (key === 'daily') {
        groupKey = format(date, 'MMM dd, yyyy');
      } else if (key === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        groupKey = `Week of ${format(weekStart, 'MMM dd')}`;
      } else {
        groupKey = format(date, 'MMMM yyyy');
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = { sales: 0, expenses: 0 };
      }

      if ('totalAmount' in item) {
        grouped[groupKey].sales += item.totalAmount || 0;
      } else if ('amount' in item) {
        grouped[groupKey].expenses += item.amount || 0;
      }
    });

    return grouped;
  };

  const salesByPeriod = groupData(sales, viewMode);
  const expensesByPeriod = groupData(expenses, viewMode);

  // Merge sales and expenses data
  const mergedData: Record<string, { sales: number; expenses: number }> = {};
  Object.entries(salesByPeriod).forEach(([key, value]) => {
    mergedData[key] = { ...value };
  });
  Object.entries(expensesByPeriod).forEach(([key, value]) => {
    if (!mergedData[key]) {
      mergedData[key] = { sales: 0, expenses: 0 };
    }
    mergedData[key].expenses = value.expenses;
  });

  const sortedPeriods = Object.keys(mergedData).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // 🔒 Label reflects Daily default or selected period - LOCKED
  const dateLabel = useMemo(() => {
    return isDaily ? "Today's" : "Selected Period";
  }, [isDaily]);

  // 🔒 Sync status badge color - LOCKED
  const syncStatusColor = useMemo(() => {
    switch (syncStatus) {
      case 'connected': return 'bg-success text-success-foreground';
      case 'connecting': return 'bg-warning text-warning-foreground';
      case 'disconnected': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  }, [syncStatus]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Reports
            </h1>
            {/* 🔒 DAILY MODE BADGE - Aligned with global state */}
            {isDaily && (
              <Badge variant="secondary" className={`${syncStatusColor} text-xs font-medium`}>
                Daily Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{isDaily ? "Today's business reports" : "Reports for selected period"}</p>
        </div>
        {/* 🔒 RESET TO TODAY - Only visible when not in Daily mode */}
        {!isDaily && canSelectDateRange && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDaily}
            className="text-primary"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reset to Today
          </Button>
        )}
      </div>

      {/* 🔒 Date Range Filter - Uses global DateFilterContext */}
      <DateRangeFilter />

      {/* Grand Totals - Filtered by date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grand-total-card">
          <p className="text-primary-foreground/80 text-sm">{dateLabel} Sales</p>
          <p className="text-2xl font-bold">{currencySymbol}{totalSales.toLocaleString()}</p>
        </div>
        <Card className="stat-card bg-destructive/10 border-destructive/20">
          <p className="text-sm text-destructive">{dateLabel} Expenses</p>
          <p className="text-xl font-bold text-destructive">{currencySymbol}{totalExpenses.toLocaleString()}</p>
        </Card>
      </div>

      {/* Debt Summary - Filtered by date range */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Debt Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">{dateLabel} Debts</p>
            <p className="text-2xl font-bold">{currencySymbol}{totalDebts.toLocaleString()}</p>
          </Card>
          <Card className="stat-card bg-success/10 border-success/20">
            <p className="text-sm text-success">Paid</p>
            <p className="text-2xl font-bold text-success">{currencySymbol}{totalPaid.toLocaleString()}</p>
          </Card>
          <Card className="stat-card bg-warning/10 border-warning/20">
            <p className="text-sm text-warning">Outstanding</p>
            <p className="text-2xl font-bold text-warning">{currencySymbol}{totalOutstanding.toLocaleString()}</p>
          </Card>
        </div>
      </div>

      {/* Period View - Filtered data breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Breakdown</h2>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'daily' | 'weekly' | 'monthly')}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Period</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Sales</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {sortedPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{isDaily ? "No data for today" : "No data for selected period"}</p>
                    </td>
                  </tr>
                ) : (
                  sortedPeriods.map(period => {
                    const data = mergedData[period];
                    return (
                      <tr key={period} className="table-row-hover border-t border-border">
                        <td className="p-4 font-medium">{period}</td>
                        <td className="p-4">{currencySymbol}{data.sales.toLocaleString()}</td>
                        <td className="p-4 text-destructive">{currencySymbol}{data.expenses.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
