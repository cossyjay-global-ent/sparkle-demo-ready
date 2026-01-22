/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔒 PROFIT PAGE - PRODUCTION LOCKED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ NON-NEGOTIABLE RULES - DO NOT MODIFY WITHOUT AUTHORIZATION:
 * 
 * 1. DAILY is the DEFAULT - always shows today's profit on load
 * 2. Uses global DateFilterContext for consistent date filtering
 * 3. FROM → TO calendar filters work for historical profit viewing
 * 4. Admin date changes sync in real-time across all devices
 * 5. Offline → Online always reverts to Daily safely
 * 6. PWA relaunch always starts fresh with Daily profit view
 * 
 * This file is PRODUCTION-LOCKED for Play Store stability.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCloudData } from '@/contexts/CloudDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, TrendingUp, Eye, EyeOff, Calendar, RefreshCw } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/DateRangeFilter';

type Sale = Tables<'sales'>;
type Expense = Tables<'expenses'>;

export default function ProfitPage() {
  const { hasProfitPassword, setProfitPassword, verifyProfitPassword, user } = useAuth();
  const { getSales, getExpenses } = useCloudData();
  const { currency } = useCurrency();
  const { dateRange, isDaily, resetToDaily, syncStatus, canSelectDateRange } = useDateFilter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 RACE-SAFE STATE MACHINE - SINGLE SOURCE OF TRUTH (NON-REVERSIBLE)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Atomic state flags - prevents double initialization & async drift
  const stateRef = useRef({
    mounted: true,
    initialized: false,
    locked: false,
    lastResetTimestamp: 0,
    lastUserId: null as string | null,
    resetCount: 0 // Debug counter
  });

  // 🔒 DEBOUNCE CONSTANT: Prevents multiple rapid resets causing race conditions
  const RESET_DEBOUNCE_MS = 200;
  const INIT_LOCK_TIMEOUT_MS = 500;

  const currencySymbol = currency.symbol;

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 ATOMIC SAFE RESET - DEBOUNCED & RACE-CONDITION PROOF
  // ═══════════════════════════════════════════════════════════════════════════

  const atomicResetToDaily = useCallback((source: string) => {
    const state = stateRef.current;
    const now = Date.now();
    
    // Guard 1: Component must be mounted
    if (!state.mounted) {
      console.log(`[ProfitPage] ✗ Reset blocked (unmounted) - source: ${source}`);
      return false;
    }
    
    // Guard 2: Debounce rapid calls
    if (now - state.lastResetTimestamp < RESET_DEBOUNCE_MS) {
      console.log(`[ProfitPage] ✗ Reset debounced - source: ${source}`);
      return false;
    }
    
    // Guard 3: Prevent concurrent resets
    if (state.locked) {
      console.log(`[ProfitPage] ✗ Reset locked - source: ${source}`);
      return false;
    }
    
    // Acquire lock
    state.locked = true;
    state.lastResetTimestamp = now;
    state.resetCount++;
    
    // Execute reset
    resetToDaily();
    console.log(`[ProfitPage] ✓ LOCKED: Daily reset #${state.resetCount} - source: ${source}`);
    
    // Release lock after debounce period
    setTimeout(() => {
      if (stateRef.current.mounted) {
        stateRef.current.locked = false;
      }
    }, RESET_DEBOUNCE_MS);
    
    return true;
  }, [resetToDaily]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 INITIALIZATION - SINGLE ATOMIC OPERATION (NON-REVERSIBLE)
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const state = stateRef.current;
    state.mounted = true;
    
    // One-time initialization - ATOMIC
    if (!state.initialized && !state.locked) {
      state.initialized = true;
      state.locked = true;
      
      // Synchronous reset on mount - no microtask needed
      resetToDaily();
      console.log('[ProfitPage] ✓ PERMANENT LOCK: Initialized with Daily default');
      
      // Release lock after timeout
      setTimeout(() => {
        if (stateRef.current.mounted) {
          stateRef.current.locked = false;
        }
      }, INIT_LOCK_TIMEOUT_MS);
    }
    
    return () => {
      state.mounted = false;
    };
  }, []); // Empty deps - runs exactly once

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 AUTH STATE CHANGE HANDLER - RACE-SAFE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const state = stateRef.current;
    const currentUserId = user?.id || null;
    
    // Skip if not initialized yet
    if (!state.initialized) return;
    
    // Detect actual user change
    if (state.lastUserId !== currentUserId) {
      const wasLoggedIn = state.lastUserId !== null;
      const isNowLoggedIn = currentUserId !== null;
      
      state.lastUserId = currentUserId;
      
      // Reset to Daily on any auth state change
      if (wasLoggedIn || isNowLoggedIn) {
        atomicResetToDaily('auth-change');
      }
    }
  }, [user?.id, atomicResetToDaily]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 CONNECTIVITY & VISIBILITY HANDLERS - CONSOLIDATED & RACE-SAFE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const state = stateRef.current;
    
    const handleOnline = () => {
      if (state.mounted && state.initialized) {
        atomicResetToDaily('online');
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.mounted && state.initialized) {
        atomicResetToDaily('visibility');
      }
    };
    
    const handleFocus = () => {
      if (state.mounted && state.initialized) {
        // Only reset if drifted from daily AND user can't select ranges
        if (!isDaily && !canSelectDateRange) {
          atomicResetToDaily('focus-drift-correction');
        }
      }
    };
    
    // Register all handlers
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [atomicResetToDaily, isDaily, canSelectDateRange]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION & DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!hasProfitPassword()) {
      setShowSetPassword(true);
    } else {
      setShowVerifyPassword(true);
    }
  }, [hasProfitPassword]);

  const loadData = useCallback(async () => {
    const [salesData, expensesData] = await Promise.all([
      getSales(),
      getExpenses()
    ]);
    if (stateRef.current.mounted) {
      setAllSales(salesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setAllExpenses(expensesData);
    }
  }, [getSales, getExpenses]);

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 DATA FILTERING - ALIGNED WITH GLOBAL DATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  // Filter data by selected date range (from global DateFilterContext)
  const fromTimestamp = dateRange.fromDate.getTime();
  const toTimestamp = dateRange.toDate.getTime();

  const filteredSales = allSales.filter(s => {
    const saleDate = new Date(s.date).getTime();
    return saleDate >= fromTimestamp && saleDate <= toTimestamp;
  });
  const filteredExpenses = allExpenses.filter(e => {
    const expenseDate = new Date(e.date).getTime();
    return expenseDate >= fromTimestamp && expenseDate <= toTimestamp;
  });

  // 🔒 NON-NEGOTIABLE: Profit = Sales - Expenses
  const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalProfit - totalExpensesAmount;

  // Calculate by period (for quick reference cards - ALWAYS based on actual dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndTimestamp = todayEnd.getTime();
  
  const weekStart = todayStart - (today.getDay() * 86400000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

  // Quick reference values (always show today/week/month regardless of filter)
  const todayProfit = allSales.filter(s => {
    const saleDate = new Date(s.date).getTime();
    return saleDate >= todayStart && saleDate <= todayEndTimestamp;
  }).reduce((sum, s) => sum + s.profit, 0);
  const weekProfit = allSales.filter(s => new Date(s.date).getTime() >= weekStart).reduce((sum, s) => sum + s.profit, 0);
  const monthProfit = allSales.filter(s => new Date(s.date).getTime() >= monthStart).reduce((sum, s) => sum + s.profit, 0);

  const formatDate = (dateValue: string | number) => {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : new Date(dateValue);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Profit Records
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Track your business profits</p>
            {isDaily && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                <Calendar className="w-3 h-3 mr-1" />
                Daily Mode
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDaily && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDaily}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset to Today
            </Button>
          )}
          <DateRangeFilter />
        </div>
      </div>

      {/* Filtered Period Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grand-total-card">
          <p className="text-primary-foreground/80 text-sm">{dateLabel} Profit</p>
          <p className="text-3xl font-bold">{currencySymbol}{totalProfit.toLocaleString()}</p>
        </div>
        <Card className="stat-card bg-destructive/10 border-destructive/20">
          <p className="text-sm text-destructive">{dateLabel} Expenses</p>
          <p className="text-2xl font-bold text-destructive">{currencySymbol}{totalExpensesAmount.toLocaleString()}</p>
        </Card>
        <Card className={`stat-card ${netProfit >= 0 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
          <p className={`text-sm ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{dateLabel} Net</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {currencySymbol}{netProfit.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Quick Period Reference */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">Today's Profit</p>
            <p className="text-2xl font-bold text-success">{currencySymbol}{todayProfit.toLocaleString()}</p>
          </Card>
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold text-success">{currencySymbol}{weekProfit.toLocaleString()}</p>
          </Card>
          <Card className="stat-card">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-success">{currencySymbol}{monthProfit.toLocaleString()}</p>
          </Card>
        </div>
      </div>

      {/* Profit History - Filtered by Date Range */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">{dateLabel} Profit History</h3>
          <p className="text-sm text-muted-foreground">
            {filteredSales.length} record{filteredSales.length !== 1 ? 's' : ''} found
          </p>
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
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No profit records for {isDaily ? 'today' : 'selected period'}</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="table-row-hover border-t border-border">
                    <td className="p-4 font-medium">{sale.product_name}</td>
                    <td className="p-4">{sale.quantity}</td>
                    <td className="p-4">{currencySymbol}{sale.total_amount.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{currencySymbol}{(sale.cost_price * sale.quantity).toLocaleString()}</td>
                    <td className="p-4 text-success font-medium">{currencySymbol}{sale.profit.toLocaleString()}</td>
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
