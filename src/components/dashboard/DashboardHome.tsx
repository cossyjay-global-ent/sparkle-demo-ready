import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShoppingCart, 
  Package, 
  Receipt, 
  TrendingUp, 
  Users, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Sale, Expense, Product, Customer, Debt } from '@/lib/database';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}

function StatCard({ title, value, subtitle, icon, trend, trendValue, className }: StatCardProps) {
  return (
    <Card className={`stat-card ${className || ''}`}>
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

export default function DashboardHome() {
  const { settings } = useAuth();
  const { getSales, getExpenses, getProducts, getCustomers, getDebts } = useData();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalDebts: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    todaySales: 0,
    todayProfit: 0
  });

  const currency = settings?.currencySymbol || '₦';

  useEffect(() => {
    const loadStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayEnd = todayStart + 86400000;

      const [sales, expenses, products, customers, debts] = await Promise.all([
        getSales(),
        getExpenses(),
        getProducts(),
        getCustomers(),
        getDebts()
      ]);

      const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
      const totalDebts = debts.reduce((sum, d) => sum + d.totalAmount, 0);
      const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
      
      const todaySalesData = sales.filter(s => s.date >= todayStart && s.date < todayEnd);
      const todaySales = todaySalesData.reduce((sum, s) => sum + s.totalAmount, 0);
      const todayProfit = todaySalesData.reduce((sum, s) => sum + s.profit, 0);

      setStats({
        totalSales,
        totalExpenses,
        totalProfit,
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalDebts,
        totalPaid,
        totalOutstanding: totalDebts - totalPaid,
        todaySales,
        todayProfit
      });
    };

    loadStats();
  }, [getSales, getExpenses, getProducts, getCustomers, getDebts]);

  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Today's overview</p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grand-total-card">
          <p className="text-primary-foreground/80 text-sm mb-1">Today's Sales</p>
          <p className="text-3xl font-bold">{formatCurrency(stats.todaySales)}</p>
        </div>
        <div className="grand-total-card">
          <p className="text-primary-foreground/80 text-sm mb-1">Today's Profit</p>
          <p className="text-3xl font-bold">{formatCurrency(stats.todayProfit)}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales"
          value={formatCurrency(stats.totalSales)}
          icon={<ShoppingCart className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          icon={<Receipt className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats.totalProfit)}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Products"
          value={stats.totalProducts.toString()}
          icon={<Package className="w-5 h-5 text-primary" />}
        />
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
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.totalProfit - stats.totalExpenses)}
          subtitle="Profit minus expenses"
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
        />
      </div>
    </div>
  );
}
