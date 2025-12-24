import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Sale, Expense, Debt } from '@/lib/database';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { settings } = useAuth();
  const { getSales, getExpenses, getDebts } = useData();
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(new Date().setDate(1)));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const currency = settings?.currencySymbol || '₦';

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  const loadData = async () => {
    if (!fromDate || !toDate) return;

    const startTime = fromDate.setHours(0, 0, 0, 0);
    const endTime = toDate.setHours(23, 59, 59, 999);

    const [salesData, expensesData, debtsData] = await Promise.all([
      getSales(startTime, endTime),
      getExpenses(startTime, endTime),
      getDebts(startTime, endTime)
    ]);

    setSales(salesData);
    setExpenses(expensesData);
    setDebts(debtsData);
  };

  // Calculate totals (no profit - profit only in Profit section)
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalOutstanding = totalDebts - totalPaid;

  // Group by date/week/month (no profit tracking - profit only in Profit section)
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

  // Merge sales and expenses data (no profit)
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
    // Sort by date descending
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Reports
        </h1>
        <p className="text-muted-foreground">View detailed business reports</p>
      </div>

      {/* Date Filter */}
      <div className="date-filter-container">
        <span className="text-sm text-muted-foreground font-medium">From</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={setFromDate}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-sm text-muted-foreground font-medium">To</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={setToDate}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Button onClick={loadData} className="ml-auto">
          Apply Filter
        </Button>
      </div>

      {/* Grand Totals - No profit display (profit only in Profit section) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grand-total-card">
          <p className="text-primary-foreground/80 text-sm">Total Sales</p>
          <p className="text-2xl font-bold">{currency}{totalSales.toLocaleString()}</p>
        </div>
        <Card className="stat-card bg-destructive/10 border-destructive/20">
          <p className="text-sm text-destructive">Total Expenses</p>
          <p className="text-xl font-bold text-destructive">{currency}{totalExpenses.toLocaleString()}</p>
        </Card>
      </div>

      {/* Debt Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Debt Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">Total Debts</p>
            <p className="text-2xl font-bold">{currency}{totalDebts.toLocaleString()}</p>
          </Card>
          <Card className="stat-card bg-success/10 border-success/20">
            <p className="text-sm text-success">Total Paid</p>
            <p className="text-2xl font-bold text-success">{currency}{totalPaid.toLocaleString()}</p>
          </Card>
          <Card className="stat-card bg-warning/10 border-warning/20">
            <p className="text-sm text-warning">Outstanding</p>
            <p className="text-2xl font-bold text-warning">{currency}{totalOutstanding.toLocaleString()}</p>
          </Card>
        </div>
      </div>

      {/* Period View */}
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
                      <p>No data for selected period</p>
                    </td>
                  </tr>
                ) : (
                  sortedPeriods.map(period => {
                    const data = mergedData[period];
                    return (
                      <tr key={period} className="table-row-hover border-t border-border">
                        <td className="p-4 font-medium">{period}</td>
                        <td className="p-4">{currency}{data.sales.toLocaleString()}</td>
                        <td className="p-4 text-destructive">{currency}{data.expenses.toLocaleString()}</td>
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
