import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Eye, CreditCard, Edit2, Trash2, Phone, ArrowLeft, X } from 'lucide-react';
import { Debt, DebtItem, DebtPayment, Customer, generateId } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ViewMode = 'list' | 'add' | 'view' | 'edit' | 'payment';

export default function DebtsPage() {
  const { getDebts, addDebt, updateDebt, deleteDebt, getDebtPayments, addDebtPayment, getCustomers, addCustomer } = useData();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);

  // New debt form state
  const [newDebtForm, setNewDebtForm] = useState({
    customerName: '',
    customerPhone: '',
    customerId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    items: [{ id: generateId(), itemName: '', quantity: 1, price: 0, total: 0, date: Date.now() }] as DebtItem[]
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    currentBalance: 0,
    items: [{ id: generateId(), itemName: '', quantity: 1, price: 0, total: 0, date: Date.now() }] as DebtItem[]
  });

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [debtsData, customersData] = await Promise.all([getDebts(), getCustomers()]);
    setDebts(debtsData.sort((a, b) => b.createdAt - a.createdAt));
    setCustomers(customersData);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'd/M/yyyy');
  };

  const formatDateTime = (timestamp: number) => {
    return format(new Date(timestamp), 'd/M/yyyy, h:mm:ss a');
  };

  const getStatus = (debt: Debt) => {
    const balance = debt.totalAmount - debt.paidAmount;
    return balance <= 0 ? 'PAID' : 'UNPAID';
  };

  const getBalance = (debt: Debt) => {
    return Math.max(0, debt.totalAmount - debt.paidAmount);
  };

  // New Debt handlers
  const handleAddItem = () => {
    const newItem: DebtItem = {
      id: generateId(),
      itemName: '',
      quantity: 1,
      price: 0,
      total: 0,
      date: Date.now()
    };
    setNewDebtForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItem = (itemId: string) => {
    if (newDebtForm.items.length > 1) {
      setNewDebtForm(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
    }
  };

  const handleItemChange = (itemId: string, field: keyof DebtItem, value: string | number) => {
    setNewDebtForm(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updated.total = Number(updated.quantity) * Number(updated.price);
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const handleCreateDebt = async () => {
    if (!newDebtForm.customerName.trim()) {
      toast({ title: "Error", description: "Customer name is required", variant: "destructive" });
      return;
    }

    const validItems = newDebtForm.items.filter(i => i.itemName.trim() && i.total > 0);
    if (validItems.length === 0) {
      toast({ title: "Error", description: "At least one item with name and price is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    // Create or find customer
    let customerId = newDebtForm.customerId;
    if (!customerId) {
      const existingCustomer = customers.find(c => 
        c.name.toLowerCase() === newDebtForm.customerName.toLowerCase()
      );
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await addCustomer({
          name: newDebtForm.customerName,
          phone: newDebtForm.customerPhone || undefined
        });
        if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    }

    const totalAmount = validItems.reduce((sum, item) => sum + item.total, 0);
    const dateTimestamp = new Date(newDebtForm.date).getTime();

    const debt = await addDebt({
      customerId: customerId || generateId(),
      customerName: newDebtForm.customerName,
      customerPhone: newDebtForm.customerPhone,
      description: validItems.map(i => i.itemName).join(', '),
      items: validItems.map(i => ({ ...i, date: dateTimestamp })),
      totalAmount,
      paidAmount: 0,
      status: 'pending',
      date: dateTimestamp
    });

    if (debt) {
      toast({ title: "Success", description: "Bundle created successfully" });
      resetNewDebtForm();
      setViewMode('list');
      loadData();
    }
    setIsLoading(false);
  };

  const resetNewDebtForm = () => {
    setNewDebtForm({
      customerName: '',
      customerPhone: '',
      customerId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      items: [{ id: generateId(), itemName: '', quantity: 1, price: 0, total: 0, date: Date.now() }]
    });
  };

  // View handlers
  const handleViewDebt = async (debt: Debt) => {
    setSelectedDebt(debt);
    const paymentsData = await getDebtPayments(debt.id);
    setPayments(paymentsData.sort((a, b) => a.createdAt - b.createdAt));
    setViewMode('view');
  };

  // Edit handlers
  const handleEditDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setEditForm({
      customerName: debt.customerName,
      customerPhone: debt.customerPhone || '',
      date: format(new Date(debt.date), 'yyyy-MM-dd'),
      currentBalance: getBalance(debt),
      items: debt.items && debt.items.length > 0 ? [...debt.items] : [{ id: generateId(), itemName: '', quantity: 1, price: 0, total: 0, date: Date.now() }]
    });
    setViewMode('edit');
  };

  const handleEditItemChange = (itemId: string, field: keyof DebtItem, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updated.total = Number(updated.quantity) * Number(updated.price);
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const handleAddEditItem = () => {
    const newItem: DebtItem = {
      id: generateId(),
      itemName: '',
      quantity: 1,
      price: 0,
      total: 0,
      date: Date.now()
    };
    setEditForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleSaveCustomerInfo = async () => {
    if (!selectedDebt) return;
    
    const success = await updateDebt(selectedDebt.id, {
      customerName: editForm.customerName,
      customerPhone: editForm.customerPhone || undefined
    });

    if (success) {
      toast({ title: "Success", description: "Customer information updated" });
      loadData();
    }
  };

  const handleUpdateBundle = async () => {
    if (!selectedDebt) return;
    
    const validItems = editForm.items.filter(i => i.itemName.trim());
    const newItemsTotal = validItems.reduce((sum, item) => sum + item.total, 0);
    const newTotalAmount = selectedDebt.paidAmount + newItemsTotal + editForm.currentBalance;

    const success = await updateDebt(selectedDebt.id, {
      customerName: editForm.customerName,
      customerPhone: editForm.customerPhone || undefined,
      items: validItems,
      totalAmount: newTotalAmount,
      description: validItems.map(i => i.itemName).join(', '),
      status: newTotalAmount <= selectedDebt.paidAmount ? 'paid' : selectedDebt.paidAmount > 0 ? 'partial' : 'pending'
    });

    if (success) {
      toast({ title: "Success", description: "Bundle updated successfully" });
      setViewMode('list');
      loadData();
    }
  };

  // Payment handlers
  const handlePaymentClick = async (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount('');
    setPaymentDescription('');
    setViewMode('payment');
  };

  const handleSubmitPayment = async () => {
    if (!selectedDebt || !paymentAmount || Number(paymentAmount) <= 0) {
      toast({ title: "Error", description: "Enter a valid payment amount", variant: "destructive" });
      return;
    }

    const balance = getBalance(selectedDebt);
    const amount = Number(paymentAmount);
    
    // Validate payment cannot exceed balance
    if (amount > balance) {
      toast({ title: "Error", description: `Payment cannot exceed outstanding balance of ₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const payment = await addDebtPayment({
      debtId: selectedDebt.id,
      amount: amount,
      date: Date.now(),
      description: paymentDescription.trim() || 'Payment Received'
    });

    if (payment) {
      toast({ title: "Success", description: "Payment recorded" });
      setViewMode('list');
      setPaymentAmount('');
      setPaymentDescription('');
      loadData();
    }
    setIsLoading(false);
  };

  // Delete handler - with confirmation
  const handleDeleteClick = (id: string) => {
    setDebtToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!debtToDelete) return;
    if (await deleteDebt(debtToDelete)) {
      toast({ title: "Deleted", description: "Bundle removed" });
      loadData();
    }
    setDeleteDialogOpen(false);
    setDebtToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDebtToDelete(null);
  };

  // Calculate totals
  const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalOutstanding = debts.reduce((sum, d) => sum + getBalance(d), 0);

  // Render customer list view
  const renderListView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debts / Bundles</h1>
          <p className="text-muted-foreground">Manage customer debts</p>
        </div>
        <Button className="btn-primary-gradient" onClick={() => setViewMode('add')}>
          <Plus className="w-4 h-4 mr-2" />
          New Bundle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Total Debt</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDebt)}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-orange-500">{formatCurrency(totalOutstanding)}</p>
        </Card>
      </div>

      {/* Customer/Debt Cards */}
      <div className="space-y-4">
        {debts.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No debt records yet</p>
          </Card>
        ) : (
          debts.map(debt => {
            const status = getStatus(debt);
            const balance = getBalance(debt);
            return (
              <Card key={debt.id} className="p-4 space-y-3">
                {/* Header: Name and Status */}
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-foreground text-lg">{debt.customerName}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    status === 'PAID' 
                      ? 'bg-emerald-500/20 text-emerald-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {status}
                  </span>
                </div>

                {/* Phone and Date */}
                <div className="text-sm text-muted-foreground space-y-1">
                  {debt.customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{debt.customerPhone}</span>
                    </div>
                  )}
                  <div>{formatDate(debt.date)}</div>
                </div>

                {/* Total and Balance */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Total:</p>
                    <p className="font-bold text-foreground">{formatCurrency(debt.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance:</p>
                    <p className="font-bold text-foreground">{formatCurrency(balance)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleViewDebt(debt)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePaymentClick(debt)}>
                    <CreditCard className="w-4 h-4 mr-1" />
                    Payment
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditDebt(debt)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteClick(debt.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  // Render Add New Bundle view
  const renderAddView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => { setViewMode('list'); resetNewDebtForm(); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">New Bundle</h1>
      </div>

      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Customer Information</h2>
        
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={newDebtForm.date}
            onChange={(e) => setNewDebtForm(prev => ({ ...prev, date: e.target.value }))}
            className="input-styled"
          />
        </div>

        <div className="space-y-2">
          <Label>Customer Name *</Label>
          <Input
            value={newDebtForm.customerName}
            onChange={(e) => setNewDebtForm(prev => ({ ...prev, customerName: e.target.value }))}
            placeholder="Customer name"
            className="input-styled"
          />
        </div>

        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            value={newDebtForm.customerPhone}
            onChange={(e) => setNewDebtForm(prev => ({ ...prev, customerPhone: e.target.value }))}
            placeholder="Phone number"
            className="input-styled"
          />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">Items</h2>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </div>

        {newDebtForm.items.map((item, index) => (
          <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Item {index + 1}</span>
              {newDebtForm.items.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={item.itemName}
                onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                placeholder="Item name"
                className="input-styled"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                  className="input-styled"
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm text-muted-foreground">Total: </span>
              <span className="font-bold text-foreground">{formatCurrency(item.total)}</span>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-border text-right">
          <span className="text-lg text-muted-foreground">Grand Total: </span>
          <span className="text-xl font-bold text-foreground">
            {formatCurrency(newDebtForm.items.reduce((sum, i) => sum + i.total, 0))}
          </span>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => { setViewMode('list'); resetNewDebtForm(); }}>
          Cancel
        </Button>
        <Button className="flex-1 btn-primary-gradient" onClick={handleCreateDebt} disabled={isLoading}>
          Create Bundle
        </Button>
      </div>
    </div>
  );

  // Render View/Details screen
  const renderViewScreen = () => {
    if (!selectedDebt) return null;
    
    const status = getStatus(selectedDebt);
    const balance = getBalance(selectedDebt);

    // Build payment history
    const paymentHistory = [
      { date: selectedDebt.createdAt, description: 'Initial Balance', amount: selectedDebt.totalAmount, isPayment: false },
      ...payments.map(p => ({ date: p.createdAt, description: p.description || 'Payment Received', amount: p.amount, isPayment: true })),
      { date: Date.now(), description: 'Current Balance', amount: balance, isPayment: false }
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Bundle Details</h1>
        </div>

        {/* Details Section */}
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date:</p>
              <p className="font-medium text-foreground">{formatDate(selectedDebt.date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone:</p>
              <p className="font-medium text-foreground">{selectedDebt.customerPhone || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status:</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              status === 'PAID' 
                ? 'bg-emerald-500/20 text-emerald-500' 
                : 'bg-red-500/20 text-red-500'
            }`}>
              {status === 'PAID' ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </Card>

        {/* Items Table */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Items</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDebt.items && selectedDebt.items.length > 0 ? (
                  selectedDebt.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {selectedDebt.description || 'No items'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Totals */}
        <Card className="p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Grand Total:</span>
            <span className="font-bold text-foreground">{formatCurrency(selectedDebt.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Balance:</span>
            <span className="font-bold text-foreground">{formatCurrency(balance)}</span>
          </div>
        </Card>

        {/* Payment History */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Payment History</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDateTime(entry.date)}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className={`text-right ${entry.isPayment ? 'text-emerald-500' : ''}`}>
                      {entry.isPayment ? `-${formatCurrency(entry.amount)}` : formatCurrency(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Button className="w-full" variant="outline" onClick={() => setViewMode('list')}>
          Back to List
        </Button>
      </div>
    );
  };

  // Render Edit screen
  const renderEditScreen = () => {
    if (!selectedDebt) return null;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Add to Existing Debt</h1>
        </div>

        {/* Customer Information Section */}
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Customer Information</h2>
          
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              className="input-styled"
            />
          </div>

          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              value={editForm.customerName}
              onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Customer name"
              className="input-styled"
            />
          </div>

          <div className="space-y-2">
            <Label>Current Balance (Before Adding New Items)</Label>
            <Input
              value={formatCurrency(editForm.currentBalance)}
              disabled
              className="input-styled bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={editForm.customerPhone}
              onChange={(e) => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))}
              placeholder="Phone number"
              className="input-styled"
            />
          </div>

          <Button variant="outline" onClick={handleSaveCustomerInfo}>
            Save Changes
          </Button>
        </Card>

        {/* Items Section */}
        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Items</h2>
            <Button variant="outline" size="sm" onClick={handleAddEditItem}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          {editForm.items.map((item, index) => (
            <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  value={formatDate(item.date)}
                  disabled
                  className="input-styled bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input
                  value={item.itemName}
                  onChange={(e) => handleEditItemChange(item.id, 'itemName', e.target.value)}
                  placeholder="Item name"
                  className="input-styled"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleEditItemChange(item.id, 'quantity', Number(e.target.value))}
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handleEditItemChange(item.id, 'price', Number(e.target.value))}
                    className="input-styled"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Total</Label>
                <Input
                  value={formatCurrency(item.total)}
                  disabled
                  className="input-styled bg-muted"
                />
              </div>
            </div>
          ))}
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => setViewMode('list')}>
            Cancel
          </Button>
          <Button className="flex-1 btn-primary-gradient" onClick={handleUpdateBundle} disabled={isLoading}>
            Update Bundle
          </Button>
        </div>
      </div>
    );
  };

  // Render Payment dialog/screen
  const renderPaymentScreen = () => {
    if (!selectedDebt) return null;
    const balance = getBalance(selectedDebt);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Record Payment</h1>
        </div>

        <Card className="p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-semibold text-foreground">{selectedDebt.customerName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="text-2xl font-bold text-orange-500">{formatCurrency(balance)}</p>
          </div>

          <div className="space-y-2">
            <Label>Payment Amount *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              max={balance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
              className="input-styled"
            />
            {Number(paymentAmount) > balance && (
              <p className="text-sm text-destructive">Payment cannot exceed balance</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              placeholder="Payment description (optional)"
              className="input-styled"
            />
          </div>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => setViewMode('list')}>
            Cancel
          </Button>
          <Button className="flex-1 btn-primary-gradient" onClick={handleSubmitPayment} disabled={isLoading}>
            Submit Payment
          </Button>
        </div>
      </div>
    );
  };

  // Main render with delete confirmation dialog
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this debt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      {viewMode === 'add' && renderAddView()}
      {viewMode === 'view' && renderViewScreen()}
      {viewMode === 'edit' && renderEditScreen()}
      {viewMode === 'payment' && renderPaymentScreen()}
      {viewMode === 'list' && renderListView()}
    </>
  );
}
