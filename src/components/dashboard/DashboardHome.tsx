import { useEffect, useState, forwardRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  ShoppingCart, 
  Package, 
  Receipt, 
  Users, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { Sale, Expense, Product, Customer, Debt } from '@/lib/database';

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  function StatCard({ title, value, subtitle, icon, trend, trendValue, className, ...props }, ref) {
    return (
      <Card ref={ref} className={`stat-card ${className || ''}`} {...props}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/10">
            {icon}
          </div>
        </div>
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';

export default function DashboardHome() {
  const { getSales, getExpenses, getProducts, getCustomers, getDebts } = useData();
  const { dateRange, isDaily } = useDateFilter();
  const { currency } = useCurrency();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalDebts: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    filteredSales: 0,
    filteredExpenses: 0,
    yesterdaySales: 0,
    yesterdayExpenses: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      const fromTimestamp = dateRange.fromDate.getTime();
      const toTimestamp = dateRange.toDate.getTime();

      // Calculate yesterday's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = yesterday.getTime();
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      const yesterdayEndTimestamp = yesterdayEnd.getTime();

      const [sales, expenses, products, customers, debts] = await Promise.all([
        getSales(),
        getExpenses(),
        getProducts(),
        getCustomers(),
        getDebts()
      ]);

      const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalDebts = debts.reduce((sum, d) => sum + d.totalAmount, 0);
      const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
      
      // Filter by date range (current selection)
      const filteredSalesData = sales.filter(s => s.date >= fromTimestamp && s.date <= toTimestamp);
      const filteredSales = filteredSalesData.reduce((sum, s) => sum + s.totalAmount, 0);

      const filteredExpensesData = expenses.filter(e => e.date >= fromTimestamp && e.date <= toTimestamp);
      const filteredExpenses = filteredExpensesData.reduce((sum, e) => sum + e.amount, 0);

      // Calculate yesterday's totals for trend comparison
      const yesterdaySalesData = sales.filter(s => s.date >= yesterdayStart && s.date <= yesterdayEndTimestamp);
      const yesterdaySales = yesterdaySalesData.reduce((sum, s) => sum + s.totalAmount, 0);

      const yesterdayExpensesData = expenses.filter(e => e.date >= yesterdayStart && e.date <= yesterdayEndTimestamp);
      const yesterdayExpenses = yesterdayExpensesData.reduce((sum, e) => sum + e.amount, 0);

      setStats({
        totalSales,
        totalExpenses,
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalDebts,
        totalPaid,
        totalOutstanding: totalDebts - totalPaid,
        filteredSales,
        filteredExpenses,
        yesterdaySales,
        yesterdayExpenses
      });
    };

    loadStats();
  }, [getSales, getExpenses, getProducts, getCustomers, getDebts, dateRange]);

  const formatCurrency = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString()}`;
  };

  const dateLabel = isDaily ? "Today's" : "Selected Period";

  // Calculate percentage change compared to yesterday
  const calculateTrend = (current: number, previous: number): { trend: 'up' | 'down' | undefined; value: string | undefined } => {
    if (previous === 0) {
      if (current > 0) return { trend: 'up', value: '+100% vs yesterday' };
      return { trend: undefined, value: undefined };
    }
    const change = ((current - previous) / previous) * 100;
    if (change === 0) return { trend: undefined, value: undefined };
    return {
      trend: change > 0 ? 'up' : 'down',
      value: `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs yesterday`
    };
  };

  const salesTrend = isDaily ? calculateTrend(stats.filteredSales, stats.yesterdaySales) : { trend: undefined, value: undefined };
  const expensesTrend = isDaily ? calculateTrend(stats.filteredExpenses, stats.yesterdayExpenses) : { trend: undefined, value: undefined };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">{isDaily ? "Today's overview" : "Custom date range overview"}</p>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter />

      {/* Selected Period Stats */}
      <div className="grand-total-card">
        <p className="text-primary-foreground/80 text-sm mb-1">{dateLabel} Sales</p>
        <p className="text-3xl font-bold">{formatCurrency(stats.filteredSales)}</p>
      </div>

      {/* Stats Grid - Always shows daily/filtered values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={`${dateLabel} Sales`}
          value={formatCurrency(stats.filteredSales)}
          icon={<ShoppingCart className="w-5 h-5 text-primary" />}
          trend={salesTrend.trend}
          trendValue={salesTrend.value}
        />
        <StatCard
          title={`${dateLabel} Expenses`}
          value={formatCurrency(stats.filteredExpenses)}
          icon={<Receipt className="w-5 h-5 text-primary" />}
          trend={expensesTrend.trend}
          trendValue={expensesTrend.value}
        />
        <StatCard
          title="Products"
          value={stats.totalProducts.toString()}
          icon={<Package className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* All-Time Summary Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">All-Time Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Total All-Time Sales"
            value={formatCurrency(stats.totalSales)}
            subtitle="Cumulative since start"
            icon={<ShoppingCart className="w-5 h-5 text-success" />}
          />
          <StatCard
            title="Total All-Time Expenses"
            value={formatCurrency(stats.totalExpenses)}
            subtitle="Cumulative since start"
            icon={<Receipt className="w-5 h-5 text-warning" />}
          />
        </div>
      </div>

      {/* Debt Summary */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Debt Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Debts"
            value={formatCurrency(stats.totalDebts)}
            icon={<CreditCard className="w-5 h-5 text-primary" />}
          />
          <StatCard
            title="Total Paid"
            value={formatCurrency(stats.totalPaid)}
            icon={<CreditCard className="w-5 h-5 text-success" />}
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(stats.totalOutstanding)}
            icon={<CreditCard className="w-5 h-5 text-warning" />}
          />
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers.toString()}
          icon={<Users className="w-5 h-5 text-primary" />}
        />
      </div>
    </div>
  );
}
