/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔒 EXPENSES PAGE - PRODUCTION LOCKED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ NON-NEGOTIABLE RULES - DO NOT MODIFY WITHOUT AUTHORIZATION:
 * 
 * 1. DAILY is the DEFAULT - uses global DateFilterContext
 * 2. Filters expenses by selected date range (Daily default)
 * 3. Aligns with Dashboard, Profit, Sales pages
 * 4. No local date state - single source of truth
 * 
 * This file is PRODUCTION-LOCKED for Play Store stability.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Receipt, Trash2, RefreshCw } from 'lucide-react';
import { Expense, now } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/DateRangeFilter';

const EXPENSE_CATEGORIES = [
  'Utilities',
  'Rent',
  'Transportation',
  'Supplies',
  'Salary',
  'Maintenance',
  'Marketing',
  'Other'
];

export default function ExpensesPage() {
  const { getExpenses, addExpense, deleteExpense } = useData();
  const { currency } = useCurrency();
  const { dateRange, isDaily, resetToDaily, syncStatus, canSelectDateRange } = useDateFilter();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: ''
  });
  const [isLoading, setIsLoading] = useState(false);

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

  // Load expenses when date range changes
  useEffect(() => {
    if (stateRef.current.mounted) {
      loadExpenses();
    }
  }, [dateRange]);

  const loadExpenses = useCallback(async () => {
    const data = await getExpenses();
    if (stateRef.current.mounted) {
      setAllExpenses(data.sort((a, b) => b.date - a.date));
    }
  }, [getExpenses]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 DATA FILTERING - ALIGNED WITH GLOBAL DATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  const fromTimestamp = dateRange.fromDate.getTime();
  const toTimestamp = dateRange.toDate.getTime();

  // Filter expenses by selected date range
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter(e => e.date >= fromTimestamp && e.date <= toTimestamp);
  }, [allExpenses, fromTimestamp, toTimestamp]);

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.category) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const expense = await addExpense({
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: now()
    });

    if (expense) {
      toast({ title: "Success", description: "Expense recorded" });
      setIsDialogOpen(false);
      setFormData({ description: '', amount: '', category: '' });
      loadExpenses();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (await deleteExpense(id)) {
      toast({ title: "Deleted", description: "Expense removed" });
      loadExpenses();
    }
  };

  // Total for filtered period (not all-time)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Group by category (filtered data)
  const byCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

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
            <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
            {/* 🔒 DAILY MODE BADGE - Aligned with global state */}
            {isDaily && (
              <Badge variant="secondary" className={`${syncStatusColor} text-xs font-medium`}>
                Daily Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{isDaily ? "Today's expenses" : "Expenses for selected period"}</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Electricity bill"
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full btn-primary-gradient"
                >
                  Record Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 🔒 Date Range Filter - Uses global DateFilterContext */}
      <DateRangeFilter />

      {/* Grand Total - Shows filtered period total */}
      <div className="grand-total-card">
        <p className="text-primary-foreground/80 text-sm">{dateLabel} Expenses</p>
        <p className="text-3xl font-bold">{currencySymbol}{totalExpenses.toLocaleString()}</p>
      </div>

      {/* Category Breakdown - Filtered data */}
      {Object.keys(byCategory).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(byCategory).map(([category, amount]) => (
            <Card key={category} className="stat-card">
              <p className="text-xs text-muted-foreground">{category}</p>
              <p className="text-lg font-bold">{currencySymbol}{amount.toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Expenses List - Filtered by date range */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{isDaily ? "No expenses recorded today" : "No expenses for selected period"}</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => (
                  <tr key={expense.id} className="table-row-hover border-t border-border">
                    <td className="p-4 font-medium">{expense.description}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-xs bg-muted rounded">{expense.category}</span>
                    </td>
                    <td className="p-4 text-destructive font-medium">{currencySymbol}{expense.amount.toLocaleString()}</td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(expense.date)}</td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
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
