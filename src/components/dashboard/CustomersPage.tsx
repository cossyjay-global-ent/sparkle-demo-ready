import { useState, useEffect, forwardRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useCurrency } from '@/contexts/CurrencyContext';
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
import { Plus, Users, Trash2, Edit2, Phone, Eye, CreditCard, ArrowLeft, Search } from 'lucide-react';
import { Customer, Debt } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ViewMode = 'list' | 'view';

const CustomersPage = forwardRef<HTMLDivElement, {}>((props, ref) => {
  const { getCustomers, addCustomer, updateCustomer, deleteCustomer, getDebts } = useData();
  const { currency } = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [customersData, debtsData] = await Promise.all([getCustomers(), getDebts()]);
    setCustomers(customersData.sort((a, b) => b.createdAt - a.createdAt));
    setDebts(debtsData);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '' });
    setEditingCustomer(null);
  };

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Customer name is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    if (editingCustomer) {
      const success = await updateCustomer(editingCustomer.id, {
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined
      });
      if (success) {
        toast({ title: "Success", description: "Customer updated" });
      }
    } else {
      const customer = await addCustomer({
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined
      });
      if (customer) {
        toast({ title: "Success", description: "Customer added" });
      }
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
    setIsLoading(false);
  };

  const handleDeleteClick = (id: string) => {
    setCustomerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    if (await deleteCustomer(customerToDelete)) {
      toast({ title: "Deleted", description: "Customer removed" });
      loadData();
    }
    setDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('view');
  };

  const formatCurrency = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'd/M/yyyy');
  };

  // Get customer debt info
  const getCustomerDebtInfo = (customerId: string) => {
    const customerDebts = debts.filter(d => d.customerId === customerId);
    const totalAmount = customerDebts.reduce((sum, d) => sum + d.totalAmount, 0);
    const paidAmount = customerDebts.reduce((sum, d) => sum + d.paidAmount, 0);
    const balance = totalAmount - paidAmount;
    const status = balance <= 0 ? 'PAID' : 'UNPAID';
    const lastDebtDate = customerDebts.length > 0 
      ? Math.max(...customerDebts.map(d => d.date))
      : null;
    return { totalAmount, paidAmount, balance, status, lastDebtDate, debtCount: customerDebts.length };
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      (customer.phone && customer.phone.toLowerCase().includes(query))
    );
  });

  // Render customer view
  const renderViewMode = () => {
    if (!selectedCustomer) return null;
    const debtInfo = getCustomerDebtInfo(selectedCustomer.id);
    const customerDebts = debts.filter(d => d.customerId === selectedCustomer.id);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Customer Details</h1>
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-semibold text-foreground">{selectedCustomer.name}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              debtInfo.status === 'PAID' 
                ? 'bg-emerald-500/20 text-emerald-500' 
                : 'bg-red-500/20 text-red-500'
            }`}>
              {debtInfo.status}
            </span>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            {selectedCustomer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{selectedCustomer.phone}</span>
              </div>
            )}
            {selectedCustomer.email && <p>Email: {selectedCustomer.email}</p>}
            {selectedCustomer.address && <p>Address: {selectedCustomer.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Total:</p>
              <p className="font-bold text-foreground">{formatCurrency(debtInfo.totalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance:</p>
              <p className="font-bold text-foreground">{formatCurrency(debtInfo.balance)}</p>
            </div>
          </div>
        </Card>

        {customerDebts.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Debt History ({customerDebts.length})</h3>
            {customerDebts.map(debt => (
              <Card key={debt.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-muted-foreground">{formatDate(debt.date)}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    debt.totalAmount - debt.paidAmount <= 0
                      ? 'bg-emerald-500/20 text-emerald-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {debt.totalAmount - debt.paidAmount <= 0 ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-2">{debt.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total:</p>
                    <p className="font-semibold">{formatCurrency(debt.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Balance:</p>
                    <p className="font-semibold">{formatCurrency(Math.max(0, debt.totalAmount - debt.paidAmount))}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render list view
  const renderListView = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground">Manage your customers</p>
        </div>
        <Button className="btn-primary-gradient" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 input-styled"
        />
      </div>

      {/* Summary */}
      <Card className="stat-card">
        <p className="text-sm text-muted-foreground">Total Customers</p>
        <p className="text-3xl font-bold">{customers.length}</p>
      </Card>

      {/* Customers List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No customers found' : 'No customers added yet'}
            </p>
          </Card>
        ) : (
          filteredCustomers.map(customer => {
            const debtInfo = getCustomerDebtInfo(customer.id);
            return (
              <Card key={customer.id} className="p-4 space-y-3">
                {/* Header: Name and Status */}
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-foreground text-lg">{customer.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    debtInfo.status === 'PAID' 
                      ? 'bg-emerald-500/20 text-emerald-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {debtInfo.status}
                  </span>
                </div>

                {/* Phone and Date */}
                <div className="text-sm text-muted-foreground space-y-1">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {debtInfo.lastDebtDate && (
                    <div>{formatDate(debtInfo.lastDebtDate)}</div>
                  )}
                </div>

                {/* Total and Balance */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Total:</p>
                    <p className="font-bold text-foreground">{formatCurrency(debtInfo.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance:</p>
                    <p className="font-bold text-foreground">{formatCurrency(debtInfo.balance)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleViewCustomer(customer)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {}}>
                    <CreditCard className="w-4 h-4 mr-1" />
                    Payment
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(customer)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteClick(customer.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Customer name"
                className="input-styled"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                className="input-styled"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                className="input-styled"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Address"
                className="input-styled"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full btn-primary-gradient"
            >
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
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
    </div>
  );

  return <div ref={ref}>{viewMode === 'view' ? renderViewMode() : renderListView()}</div>;
});

CustomersPage.displayName = 'CustomersPage';

export default CustomersPage;
