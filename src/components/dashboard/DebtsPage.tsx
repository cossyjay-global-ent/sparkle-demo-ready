import React, { useState, useEffect } from 'react';
import { useCloudData } from '@/contexts/CloudDataContext';
import { useRBAC } from '@/contexts/RBACContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Eye, CreditCard, Edit2, Trash2, Phone, ArrowLeft, X, MessageCircle } from 'lucide-react';
import { Tables, Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { v4 as generateId } from 'uuid';
import { openWhatsAppReminder, DebtMessageData } from '@/lib/whatsapp';

type Debt = Tables<'debts'>;
type DebtPayment = Tables<'debt_payments'>;
type Customer = Tables<'customers'>;

interface DebtItem {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
  date: number;
}

type ViewMode = 'list' | 'add' | 'view' | 'edit' | 'payment';

// Helper function to parse items from Json
const parseDebtItems = (items: Json): DebtItem[] => {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item: any) => ({
    id: item.id || generateId(),
    itemName: item.itemName || '',
    quantity: item.quantity || 1,
    price: item.price || 0,
    total: item.total || 0,
    date: item.date || Date.now()
  }));
};

// Helper to convert DebtItem[] to Json
const itemsToJson = (items: DebtItem[]): Json => {
  return items as unknown as Json;
};

export default function DebtsPage() {
  const { getDebts, addDebt, updateDebt, deleteDebt, getDebtPayments, addDebtPayment, getCustomers, addCustomer } = useCloudData();
  const { canDeleteDebt } = useRBAC();
  const { currency } = useCurrency();
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('Your Business');

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
    loadBusinessName();
  }, []);

  const loadData = async () => {
    const [debtsData, customersData] = await Promise.all([getDebts(), getCustomers()]);
    setDebts(debtsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setCustomers(customersData);
  };

  const loadBusinessName = async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.display_name) {
        setBusinessName(profile.display_name);
      }
    } catch (error) {
      console.log('Using default business name');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateValue: string | number) => {
    const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
    return format(date, 'd/M/yyyy');
  };

  const formatDateTime = (dateValue: string | number) => {
    const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
    return format(date, 'd/M/yyyy, h:mm:ss a');
  };

  const getStatus = (debt: Debt) => {
    const balance = debt.total_amount - debt.paid_amount;
    return balance <= 0 ? 'PAID' : 'UNPAID';
  };

  const getBalance = (debt: Debt) => {
    return Math.max(0, debt.total_amount - debt.paid_amount);
  };

  // WhatsApp reminder handler
  const handleWhatsAppReminder = (debt: Debt) => {
    if (!debt.customer_phone) {
      toast({ 
        title: "No Phone Number", 
        description: "This customer doesn't have a phone number on file.", 
        variant: "destructive" 
      });
      return;
    }

    const balance = getBalance(debt);
    const messageData: DebtMessageData = {
      customerName: debt.customer_name,
      customerPhone: debt.customer_phone,
      totalAmount: debt.total_amount,
      paidAmount: debt.paid_amount,
      balance,
      businessName,
      currencySymbol: currency.symbol,
    };

    const success = openWhatsAppReminder(messageData);
    if (success) {
      toast({ 
        title: "WhatsApp Opened", 
        description: "Review and send the message in WhatsApp." 
      });
    }
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
    const dateIso = new Date(newDebtForm.date).toISOString();

    const debt = await addDebt({
      customer_id: customerId || undefined,
      customer_name: newDebtForm.customerName,
      customer_phone: newDebtForm.customerPhone || null,
      description: validItems.map(i => i.itemName).join(', '),
      items: itemsToJson(validItems.map(i => ({ ...i, date: new Date(newDebtForm.date).getTime() }))),
      total_amount: totalAmount,
      paid_amount: 0,
      status: 'pending',
      date: dateIso
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
    setPayments(paymentsData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    setViewMode('view');
  };

  // Edit handlers
  const handleEditDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    const parsedItems = parseDebtItems(debt.items);
    setEditForm({
      customerName: debt.customer_name,
      customerPhone: debt.customer_phone || '',
      date: format(new Date(debt.date), 'yyyy-MM-dd'),
      currentBalance: getBalance(debt),
      items: parsedItems.length > 0 ? parsedItems : [{ id: generateId(), itemName: '', quantity: 1, price: 0, total: 0, date: Date.now() }]
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
      customer_name: editForm.customerName,
      customer_phone: editForm.customerPhone || null
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
    const newTotalAmount = selectedDebt.paid_amount + newItemsTotal + editForm.currentBalance;

    const success = await updateDebt(selectedDebt.id, {
      customer_name: editForm.customerName,
      customer_phone: editForm.customerPhone || null,
      items: itemsToJson(validItems),
      total_amount: newTotalAmount,
      description: validItems.map(i => i.itemName).join(', '),
      status: newTotalAmount <= selectedDebt.paid_amount ? 'paid' : selectedDebt.paid_amount > 0 ? 'partial' : 'pending'
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
      toast({ title: "Error", description: `Payment cannot exceed outstanding balance of ${currency.symbol}${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const payment = await addDebtPayment({
      debt_id: selectedDebt.id,
      amount: amount,
      date: new Date().toISOString(),
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
  const totalDebt = debts.reduce((sum, d) => sum + d.total_amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paid_amount, 0);
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
          <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-warning">{formatCurrency(totalOutstanding)}</p>
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
                  <h3 className="font-semibold text-foreground text-lg">{debt.customer_name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    status === 'PAID' 
                      ? 'bg-success/20 text-success' 
                      : 'bg-destructive/20 text-destructive'
                  }`}>
                    {status}
                  </span>
                </div>

                {/* Phone and Date */}
                <div className="text-sm text-muted-foreground space-y-1">
                  {debt.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{debt.customer_phone}</span>
                    </div>
                  )}
                  <div>{formatDate(debt.date)}</div>
                </div>

                {/* Total and Balance */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Total:</p>
                    <p className="font-bold text-foreground">{formatCurrency(debt.total_amount)}</p>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleWhatsAppReminder(debt)}
                    className="text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
                    title="Send WhatsApp Reminder"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Remind
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditDebt(debt)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {canDeleteDebt && (
                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(debt.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
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
        <h2 className="text-lg font-semibold text-foreground">Items</h2>
        
        {newDebtForm.items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <Label className="text-xs">Item Name</Label>
              <Input
                value={item.itemName}
                onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                placeholder="Item"
                className="input-styled"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Qty</Label>
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                className="input-styled"
              />
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Price</Label>
              <Input
                type="number"
                min="0"
                value={item.price || ''}
                onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                className="input-styled"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Total</Label>
              <p className="font-semibold py-2">{formatCurrency(item.total)}</p>
            </div>
            <div className="col-span-1">
              {newDebtForm.items.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={handleAddItem} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-lg font-bold">
          Grand Total: {formatCurrency(newDebtForm.items.reduce((sum, i) => sum + i.total, 0))}
        </p>
        <Button onClick={handleCreateDebt} disabled={isLoading} className="btn-primary-gradient">
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
    const debtItems = parseDebtItems(selectedDebt.items);

    // Build payment history
    const paymentHistory = [
      { date: selectedDebt.created_at, description: 'Initial Balance', amount: selectedDebt.total_amount, isPayment: false },
      ...payments.map(p => ({ date: p.created_at, description: p.description || 'Payment Received', amount: p.amount, isPayment: true })),
      { date: new Date().toISOString(), description: 'Current Balance', amount: balance, isPayment: false }
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
              <p className="font-medium text-foreground">{selectedDebt.customer_phone || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status:</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              status === 'PAID' 
                ? 'bg-success/20 text-success' 
                : 'bg-destructive/20 text-destructive'
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
                {debtItems.length > 0 ? (
                  debtItems.map(item => (
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
            <span className="font-bold text-foreground">{formatCurrency(selectedDebt.total_amount)}</span>
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
                {paymentHistory.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{formatDateTime(entry.date)}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className={`text-right ${entry.isPayment ? 'text-success' : ''}`}>
                      {entry.isPayment ? '-' : ''}{formatCurrency(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => handleEditDebt(selectedDebt)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleWhatsAppReminder(selectedDebt)}
            className="text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp Reminder
          </Button>
          <Button onClick={() => handlePaymentClick(selectedDebt)} className="btn-primary-gradient">
            <CreditCard className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
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

        {/* Customer Info Section */}
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Customer Information</h2>
          
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              value={editForm.customerName}
              onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
              className="input-styled"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={editForm.customerPhone}
              onChange={(e) => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))}
              className="input-styled"
            />
          </div>

          <Button variant="secondary" onClick={handleSaveCustomerInfo} className="w-full">
            Save Customer Info
          </Button>
        </Card>

        {/* Current Balance */}
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Current Balance:</span>
            <span className="text-xl font-bold text-foreground">{formatCurrency(editForm.currentBalance)}</span>
          </div>
        </Card>

        {/* Add Items Section */}
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Add New Items</h2>
          
          {editForm.items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-xs">Item Name</Label>
                <Input
                  value={item.itemName}
                  onChange={(e) => handleEditItemChange(item.id, 'itemName', e.target.value)}
                  placeholder="Item"
                  className="input-styled"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleEditItemChange(item.id, 'quantity', Number(e.target.value))}
                  className="input-styled"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.price || ''}
                  onChange={(e) => handleEditItemChange(item.id, 'price', Number(e.target.value))}
                  className="input-styled"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Total</Label>
                <p className="font-semibold py-2">{formatCurrency(item.total)}</p>
              </div>
              <div className="col-span-1">
                {editForm.items.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setEditForm(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }))}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          <Button variant="outline" onClick={handleAddEditItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </Card>

        {/* Total Summary */}
        <Card className="p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Balance:</span>
            <span className="font-medium">{formatCurrency(editForm.currentBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">New Items Total:</span>
            <span className="font-medium">{formatCurrency(editForm.items.reduce((sum, i) => sum + i.total, 0))}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold">New Total:</span>
            <span className="font-bold text-lg">{formatCurrency(editForm.currentBalance + editForm.items.reduce((sum, i) => sum + i.total, 0))}</span>
          </div>
        </Card>

        <Button onClick={handleUpdateBundle} disabled={isLoading} className="w-full btn-primary-gradient">
          Update Bundle
        </Button>
      </div>
    );
  };

  // Render Payment screen
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
            <p className="text-sm text-muted-foreground">Customer:</p>
            <p className="font-semibold text-foreground">{selectedDebt.customer_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding Balance:</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(balance)}</p>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Payment Amount *</Label>
            <Input
              type="number"
              min="0"
              max={balance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
              className="input-styled"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              placeholder="e.g., Cash payment"
              className="input-styled"
            />
          </div>

          <Button onClick={handleSubmitPayment} disabled={isLoading} className="w-full btn-primary-gradient">
            Record Payment
          </Button>
        </Card>
      </div>
    );
  };

  return (
    <>
      {viewMode === 'list' && renderListView()}
      {viewMode === 'add' && renderAddView()}
      {viewMode === 'view' && renderViewScreen()}
      {viewMode === 'edit' && renderEditScreen()}
      {viewMode === 'payment' && renderPaymentScreen()}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the debt record and all associated payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
