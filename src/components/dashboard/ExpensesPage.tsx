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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { Expense, now } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

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
  const { settings } = useAuth();
  const { getExpenses, addExpense, deleteExpense } = useData();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const currency = settings?.currencySymbol || '₦';

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data.sort((a, b) => b.date - a.date));
  };

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

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Group by category
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">Track your business expenses</p>
        </div>
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

      {/* Grand Total */}
      <div className="grand-total-card">
        <p className="text-primary-foreground/80 text-sm">Total Expenses</p>
        <p className="text-3xl font-bold">{currency}{totalExpenses.toLocaleString()}</p>
      </div>

      {/* Category Breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(byCategory).map(([category, amount]) => (
            <Card key={category} className="stat-card">
              <p className="text-xs text-muted-foreground">{category}</p>
              <p className="text-lg font-bold">{currency}{amount.toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Expenses List */}
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
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No expenses recorded yet</p>
                  </td>
                </tr>
              ) : (
                expenses.map(expense => (
                  <tr key={expense.id} className="table-row-hover border-t border-border">
                    <td className="p-4 font-medium">{expense.description}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-xs bg-muted rounded">{expense.category}</span>
                    </td>
                    <td className="p-4 text-destructive font-medium">{currency}{expense.amount.toLocaleString()}</td>
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
