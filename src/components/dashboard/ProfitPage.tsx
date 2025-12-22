import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Sale } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

export default function ProfitPage() {
  const { settings, hasProfitPassword, setProfitPassword, verifyProfitPassword } = useAuth();
  const { getSales, getExpenses } = useData();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const currency = settings?.currencySymbol || '₦';

  useEffect(() => {
    if (!hasProfitPassword()) {
      setShowSetPassword(true);
    } else {
      setShowVerifyPassword(true);
    }
  }, [hasProfitPassword]);

  const loadData = async () => {
    const [salesData, expensesData] = await Promise.all([
      getSales(),
      getExpenses()
    ]);
    setSales(salesData.sort((a, b) => b.date - a.date));
    setTotalExpenses(expensesData.reduce((sum, e) => sum + e.amount, 0));
  };

  const handleSetPassword = async () => {
    if (password.length < 4) {
      toast({ title: "Error", description: "Password must be at least 4 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const success = await setProfitPassword(password);
    if (success) {
      setShowSetPassword(false);
      setIsAuthenticated(true);
      loadData();
    }
    setIsLoading(false);
  };

  const handleVerifyPassword = async () => {
    setIsLoading(true);
    const isValid = await verifyProfitPassword(password);
    if (isValid) {
      setShowVerifyPassword(false);
      setIsAuthenticated(true);
      loadData();
    } else {
      toast({ title: "Error", description: "Incorrect password", variant: "destructive" });
    }
    setIsLoading(false);
    setPassword('');
  };

  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const netProfit = totalProfit - totalExpenses;

  // Calculate by period
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const weekStart = todayStart - (today.getDay() * 86400000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

  const todayProfit = sales.filter(s => s.date >= todayStart).reduce((sum, s) => sum + s.profit, 0);
  const weekProfit = sales.filter(s => s.date >= weekStart).reduce((sum, s) => sum + s.profit, 0);
  const monthProfit = sales.filter(s => s.date >= monthStart).reduce((sum, s) => sum + s.profit, 0);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        {/* Set Password Dialog */}
        <Dialog open={showSetPassword} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Set Profit Password
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Create a password to protect your profit records. This is separate from your login password.
              </p>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-styled pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="input-styled"
                />
              </div>
              <Button
                onClick={handleSetPassword}
                disabled={isLoading}
                className="w-full btn-primary-gradient"
              >
                Set Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Verify Password Dialog */}
        <Dialog open={showVerifyPassword} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Enter Profit Password
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Enter your profit password to view profit records.
              </p>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-styled pr-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleVerifyPassword}
                disabled={isLoading}
                className="w-full btn-primary-gradient"
              >
                Unlock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Profit Records
        </h1>
        <p className="text-muted-foreground">Track your business profits</p>
      </div>

      {/* Grand Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grand-total-card">
          <p className="text-primary-foreground/80 text-sm">Total Profit</p>
          <p className="text-3xl font-bold">{currency}{totalProfit.toLocaleString()}</p>
        </div>
        <Card className="stat-card bg-destructive/10 border-destructive/20">
          <p className="text-sm text-destructive">Total Expenses</p>
          <p className="text-2xl font-bold text-destructive">{currency}{totalExpenses.toLocaleString()}</p>
        </Card>
        <Card className={`stat-card ${netProfit >= 0 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
          <p className={`text-sm ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {currency}{netProfit.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Period Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Profit by Period</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold text-success">{currency}{todayProfit.toLocaleString()}</p>
          </Card>
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold text-success">{currency}{weekProfit.toLocaleString()}</p>
          </Card>
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-success">{currency}{monthProfit.toLocaleString()}</p>
          </Card>
        </div>
      </div>

      {/* Profit History */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Profit History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Qty</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Sale</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Cost</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Profit</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No profit records yet</p>
                  </td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id} className="table-row-hover border-t border-border">
                    <td className="p-4 font-medium">{sale.productName}</td>
                    <td className="p-4">{sale.quantity}</td>
                    <td className="p-4">{currency}{sale.totalAmount.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{currency}{(sale.costPrice * sale.quantity).toLocaleString()}</td>
                    <td className="p-4 text-success font-medium">{currency}{sale.profit.toLocaleString()}</td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(sale.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
