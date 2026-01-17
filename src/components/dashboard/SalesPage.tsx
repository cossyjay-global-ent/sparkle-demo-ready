/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔒 SALES PAGE - PRODUCTION LOCKED + CLOUD SYNC
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ NON-NEGOTIABLE RULES - DO NOT MODIFY WITHOUT AUTHORIZATION:
 * 
 * 1. DAILY is the DEFAULT - uses global DateFilterContext
 * 2. Filters sales by selected date range (Daily default)
 * 3. Aligns with Dashboard, Profit, Expenses, Reports pages
 * 4. CLOUD-SYNC-CRITICAL: All data comes from Supabase with real-time updates
 * 
 * This file is PRODUCTION-LOCKED for Play Store stability.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCloudData } from '@/contexts/CloudDataContext';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { useCurrency } from '@/contexts/CurrencyContext';
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
import { Plus, ShoppingCart, Trash2, RefreshCw, CloudIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Sale = Tables<'sales'>;

export default function SalesPage() {
  // CLOUD-SYNC-CRITICAL: Use cloud data context with real-time updates
  const { getProducts, addSale, getSales, deleteSale, dataVersion, lastSyncTime } = useCloudData();
  const { dateRange, isDaily, resetToDaily, syncStatus, canSelectDateRange } = useDateFilter();
  const { currency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualProductName, setManualProductName] = useState('');
  const [manualUnitPrice, setManualUnitPrice] = useState('');
  const [manualCostPrice, setManualCostPrice] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 RACE-SAFE STATE MACHINE - ALIGNED WITH GLOBAL DATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  
  const stateRef = useRef({
    mounted: true,
    initialized: false
  });

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

  // Filter products matching the manual input name
  const matchingProducts = products.filter(p => 
    manualProductName.trim() && 
    p.name.toLowerCase().includes(manualProductName.toLowerCase().trim())
  );

  // Handle product name change and auto-fill cost price only
  const handleManualProductNameChange = (value: string) => {
    setManualProductName(value);
    setShowSuggestions(true);
    
    // Find exact match to auto-fill cost price only (unit price stays manual)
    const exactMatch = products.find(p => p.name.toLowerCase() === value.toLowerCase().trim());
    if (exactMatch) {
      setManualCostPrice(exactMatch.cost_price.toString());
    }
  };

  // Select a suggested product (only auto-fill cost price, not unit price)
  const handleSelectSuggestion = (product: Product) => {
    setManualProductName(product.name);
    setManualCostPrice(product.cost_price.toString());
    setShowSuggestions(false);
  };

  const currencySymbol = currency.symbol;

  // CLOUD-SYNC-CRITICAL: Re-fetch data when dataVersion changes (real-time updates)
  useEffect(() => {
    if (stateRef.current.mounted) {
      loadData();
    }
  }, [dateRange, dataVersion]);

  const loadData = useCallback(async () => {
    if (!stateRef.current.mounted) return;
    
    try {
      const [productsData, salesData] = await Promise.all([
        getProducts(),
        getSales(dateRange.fromDate, dateRange.toDate)
      ]);
      
      if (stateRef.current.mounted) {
        setProducts(productsData);
        // Sort by date descending
        setSales(salesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  }, [getProducts, getSales, dateRange]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleAddSale = async () => {
    const qty = parseInt(quantity) || 1; // Default to 1 if empty
    if (qty <= 0) {
      toast({ title: "Error", description: "Quantity must be greater than 0", variant: "destructive" });
      return;
    }

    if (isManualInput) {
      // Manual input validation
      if (!manualProductName.trim()) {
        toast({ title: "Error", description: "Please enter a product name", variant: "destructive" });
        return;
      }
      const unitPrice = parseFloat(manualUnitPrice);
      const costPrice = parseFloat(manualCostPrice) || 0;
      if (isNaN(unitPrice) || unitPrice <= 0) {
        toast({ title: "Error", description: "Please enter a valid unit price", variant: "destructive" });
        return;
      }

      setIsLoading(true);
      const sale = await addSale({
        product_id: undefined,
        product_name: manualProductName.trim(),
        quantity: qty,
        unit_price: unitPrice,
        cost_price: costPrice,
        total_amount: unitPrice * qty,
        profit: (unitPrice - costPrice) * qty,
        date: new Date().toISOString()
      });

      if (sale) {
        resetForm();
      }
      setIsLoading(false);
    } else {
      // Product selection validation
      if (!selectedProduct) return;

      if (qty > selectedProduct.stock) {
        toast({ title: "Error", description: "Not enough stock available", variant: "destructive" });
        return;
      }

      setIsLoading(true);
      const sale = await addSale({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qty,
        unit_price: selectedProduct.selling_price,
        cost_price: selectedProduct.cost_price,
        total_amount: selectedProduct.selling_price * qty,
        profit: (selectedProduct.selling_price - selectedProduct.cost_price) * qty,
        date: new Date().toISOString()
      });

      if (sale) {
        resetForm();
      }
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsDialogOpen(false);
    setSelectedProductId('');
    setQuantity('');
    setIsManualInput(false);
    setManualProductName('');
    setManualUnitPrice('');
    setManualCostPrice('');
  };

  const handleDeleteSale = async (id: string) => {
    await deleteSale(id);
  };

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Sales</h1>
            {/* 🔒 DAILY MODE BADGE - Aligned with global state */}
            {isDaily && (
              <Badge variant="secondary" className={`${syncStatusColor} text-xs font-medium`}>
                Daily Mode
              </Badge>
            )}
            {/* CLOUD-SYNC-CRITICAL: Show cloud sync indicator */}
            {lastSyncTime && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <CloudIcon className="w-3 h-3 mr-1" />
                Synced
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{isDaily ? "Today's sales" : "Sales for selected period"}</p>
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
                New Sale
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Toggle between select and manual input */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isManualInput ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsManualInput(false)}
                  className="flex-1"
                >
                  Select Product
                </Button>
                <Button
                  type="button"
                  variant={isManualInput ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsManualInput(true)}
                  className="flex-1"
                >
                  Manual Input
                </Button>
              </div>

              {!isManualInput ? (
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.filter(p => p.stock > 0).map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {currencySymbol}{product.selling_price} (Stock: {product.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2 relative">
                    <Label>Product Name</Label>
                    <Input
                      type="text"
                      placeholder="Enter product name"
                      value={manualProductName}
                      onChange={(e) => handleManualProductNameChange(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="input-styled"
                    />
                    {/* Product suggestions dropdown */}
                    {showSuggestions && matchingProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                        {matchingProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between items-center"
                            onMouseDown={() => handleSelectSuggestion(product)}
                          >
                            <span className="font-medium">{product.name}</span>
                            <span className="text-sm text-muted-foreground">
                              Stock: {product.stock}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Unit Price ({currencySymbol})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={manualUnitPrice}
                        onChange={(e) => setManualUnitPrice(e.target.value)}
                        className="input-styled"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost Price ({currencySymbol})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00 (optional)"
                        value={manualCostPrice}
                        onChange={(e) => setManualCostPrice(e.target.value)}
                        className="input-styled"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={!isManualInput && selectedProduct ? selectedProduct.stock : undefined}
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-styled"
                />
              </div>

              {/* Summary for selected product */}
              {!isManualInput && selectedProduct && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="font-medium">{currencySymbol}{selectedProduct.selling_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg">{currencySymbol}{selectedProduct.selling_price * parseInt(quantity || '0')}</span>
                  </div>
                </div>
              )}

              {/* Summary for manual input */}
              {isManualInput && manualUnitPrice && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="font-medium">{currencySymbol}{parseFloat(manualUnitPrice) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg">{currencySymbol}{(parseFloat(manualUnitPrice) || 0) * parseInt(quantity || '0')}</span>
                  </div>
                  {manualCostPrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit:</span>
                      <span className="font-medium text-green-600">{currencySymbol}{((parseFloat(manualUnitPrice) || 0) - (parseFloat(manualCostPrice) || 0)) * parseInt(quantity || '0')}</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full btn-primary-gradient"
                onClick={handleAddSale}
                disabled={isLoading || (!isManualInput && !selectedProduct)}
              >
                {isLoading ? 'Recording...' : 'Record Sale'}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 🔒 Date Range Filter - Uses global DateFilterContext */}
      <DateRangeFilter />

      {/* Grand Total Card */}
      <div className="grand-total-card">
        <p className="text-primary-foreground/80 text-sm mb-1">{dateLabel} Total Sales</p>
        <p className="text-3xl font-bold">{currencySymbol}{totalSales.toLocaleString()}</p>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {sales.length === 0 ? (
          <Card className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No sales recorded {isDaily ? 'today' : 'for selected period'}</p>
          </Card>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{sale.product_name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      x{sale.quantity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currencySymbol}{sale.unit_price} × {sale.quantity} = {currencySymbol}{sale.total_amount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(sale.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-lg text-foreground">{currencySymbol}{sale.total_amount}</p>
                    <p className="text-xs text-success">Profit: {currencySymbol}{sale.profit}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteSale(sale.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
