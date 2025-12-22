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
import { Plus, CreditCard, Trash2, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Customer, Debt, DebtPayment, now } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

export default function DebtsPage() {
  const { settings } = useAuth();
  const { getCustomers, getDebts, addDebt, updateDebt, deleteDebt, addDebtPayment, getDebtPayments } = useData();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [debtForm, setDebtForm] = useState({
    customerId: '',
    description: '',
    totalAmount: '',
    dueDate: ''
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currency = settings?.currencySymbol || '₦';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [customersData, debtsData] = await Promise.all([
      getCustomers(),
      getDebts()
    ]);
    setCustomers(customersData);
    setDebts(debtsData.sort((a, b) => b.date - a.date));
  };

  const handleAddDebt = async () => {
    if (!debtForm.customerId || !debtForm.description || !debtForm.totalAmount) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const customer = customers.find(c => c.id === debtForm.customerId);
    if (!customer) return;

    setIsLoading(true);
    const debt = await addDebt({
      customerId: customer.id,
      customerName: customer.name,
      description: debtForm.description,
      totalAmount: parseFloat(debtForm.totalAmount),
      paidAmount: 0,
      dueDate: debtForm.dueDate ? new Date(debtForm.dueDate).getTime() : undefined,
      status: 'pending',
      date: now()
    });

    if (debt) {
      toast({ title: "Success", description: "Debt recorded" });
      setIsDebtDialogOpen(false);
      setDebtForm({ customerId: '', description: '', totalAmount: '', dueDate: '' });
      loadData();
    }
    setIsLoading(false);
  };

  const handleAddPayment = async () => {
    if (!selectedDebt || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    const remaining = selectedDebt.totalAmount - selectedDebt.paidAmount;
    
    if (amount > remaining) {
      toast({ title: "Error", description: "Payment exceeds remaining amount", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const payment = await addDebtPayment({
      debtId: selectedDebt.id,
      amount,
      date: now(),
      note: paymentNote || undefined
    });

    if (payment) {
      toast({ title: "Success", description: "Payment recorded" });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
      setSelectedDebt(null);
      loadData();
    }
    setIsLoading(false);
  };

  const handleDeleteDebt = async (id: string) => {
    if (await deleteDebt(id)) {
      toast({ title: "Deleted", description: "Debt removed" });
      loadData();
    }
  };

  const totalDebts = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalOutstanding = totalDebts - totalPaid;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'partial': return <Clock className="w-4 h-4 text-warning" />;
      default: return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-success/10 text-success',
      partial: 'bg-warning/10 text-warning',
      pending: 'bg-destructive/10 text-destructive'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debts</h1>
          <p className="text-muted-foreground">Manage customer debts and payments</p>
        </div>
        <Dialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary-gradient">
              <Plus className="w-4 h-4 mr-2" />
              Add Debt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Debt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={debtForm.customerId} onValueChange={(v) => setDebtForm({ ...debtForm, customerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={debtForm.description}
                  onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                  placeholder="e.g., Goods purchased on credit"
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={debtForm.totalAmount}
                  onChange={(e) => setDebtForm({ ...debtForm, totalAmount: e.target.value })}
                  placeholder="0"
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Input
                  type="date"
                  value={debtForm.dueDate}
                  onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })}
                  className="input-styled"
                />
              </div>
              <Button
                onClick={handleAddDebt}
                disabled={isLoading}
                className="w-full btn-primary-gradient"
              >
                Record Debt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grand Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grand-total-card">
          <p className="text-primary-foreground/80 text-sm">Total Debts</p>
          <p className="text-3xl font-bold">{currency}{totalDebts.toLocaleString()}</p>
        </div>
        <Card className="stat-card bg-success/10 border-success/20">
          <p className="text-sm text-success">Total Paid</p>
          <p className="text-2xl font-bold text-success">{currency}{totalPaid.toLocaleString()}</p>
        </Card>
        <Card className="stat-card bg-warning/10 border-warning/20">
          <p className="text-sm text-warning">Outstanding</p>
          <p className="text-2xl font-bold text-warning">{currency}{totalOutstanding.toLocaleString()}</p>
        </Card>
      </div>

      {/* Debts List */}
      <div className="space-y-4">
        {debts.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No debts recorded yet</p>
          </Card>
        ) : (
          debts.map(debt => (
            <Card key={debt.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(debt.status)}
                    <h3 className="font-semibold text-foreground">{debt.customerName}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(debt.status)}`}>
                      {debt.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{debt.description}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span>Total: <strong>{currency}{debt.totalAmount.toLocaleString()}</strong></span>
                    <span className="text-success">Paid: {currency}{debt.paidAmount.toLocaleString()}</span>
                    <span className="text-warning">Remaining: {currency}{(debt.totalAmount - debt.paidAmount).toLocaleString()}</span>
                    {debt.dueDate && (
                      <span className="text-muted-foreground">Due: {formatDate(debt.dueDate)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {debt.status !== 'paid' && (
                    <Button
                      size="sm"
                      onClick={() => { setSelectedDebt(debt); setIsPaymentDialogOpen(true); }}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Pay
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDebt(debt.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { setIsPaymentDialogOpen(open); if (!open) setSelectedDebt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedDebt.customerName}</p>
                <p className="text-sm text-muted-foreground">{selectedDebt.description}</p>
                <div className="mt-2 text-sm">
                  <span>Remaining: </span>
                  <strong className="text-warning">{currency}{(selectedDebt.totalAmount - selectedDebt.paidAmount).toLocaleString()}</strong>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  max={selectedDebt.totalAmount - selectedDebt.paidAmount}
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Payment note"
                  className="input-styled"
                />
              </div>
              <Button
                onClick={handleAddPayment}
                disabled={isLoading}
                className="w-full btn-primary-gradient"
              >
                Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
