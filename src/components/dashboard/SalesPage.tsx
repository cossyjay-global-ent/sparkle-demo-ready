import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFilter } from '@/contexts/DateFilterContext';
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
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Product, Sale, now } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/DateRangeFilter';

export default function SalesPage() {
  const { settings } = useAuth();
  const { getProducts, addSale, getSales, deleteSale } = useData();
  const { dateRange, isDaily } = useDateFilter();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualProductName, setManualProductName] = useState('');
  const [manualUnitPrice, setManualUnitPrice] = useState('');
  const [manualCostPrice, setManualCostPrice] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter products matching the manual input name
  const matchingProducts = products.filter(p => 
    manualProductName.trim() && 
    p.name.toLowerCase().includes(manualProductName.toLowerCase().trim())
  );

  // Handle product name change and auto-fill cost price
  const handleManualProductNameChange = (value: string) => {
    setManualProductName(value);
    setShowSuggestions(true);
    
    // Find exact match or first matching product to auto-fill cost price
    const exactMatch = products.find(p => p.name.toLowerCase() === value.toLowerCase().trim());
    if (exactMatch) {
      setManualCostPrice(exactMatch.costPrice.toString());
      setManualUnitPrice(exactMatch.sellingPrice.toString());
    }
  };

  // Select a suggested product
  const handleSelectSuggestion = (product: Product) => {
    setManualProductName(product.name);
    setManualCostPrice(product.costPrice.toString());
    setManualUnitPrice(product.sellingPrice.toString());
    setShowSuggestions(false);
  };

  const currency = settings?.currencySymbol || '₦';

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    const fromTimestamp = dateRange.fromDate.getTime();
    const toTimestamp = dateRange.toDate.getTime();
    
    const [productsData, salesData] = await Promise.all([
      getProducts(),
      getSales(fromTimestamp, toTimestamp)
    ]);
    setProducts(productsData);
    setSales(salesData.sort((a, b) => b.date - a.date));
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleAddSale = async () => {
    const qty = parseInt(quantity);
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
        productId: undefined,
        productName: manualProductName.trim(),
        quantity: qty,
        unitPrice: unitPrice,
        costPrice: costPrice,
        totalAmount: unitPrice * qty,
        profit: (unitPrice - costPrice) * qty,
        date: now()
      });

      if (sale) {
        toast({ title: "Success", description: "Sale recorded successfully" });
        resetForm();
        loadData();
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
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: qty,
        unitPrice: selectedProduct.sellingPrice,
        costPrice: selectedProduct.costPrice,
        totalAmount: selectedProduct.sellingPrice * qty,
        profit: (selectedProduct.sellingPrice - selectedProduct.costPrice) * qty,
        date: now()
      });

      if (sale) {
        toast({ title: "Success", description: "Sale recorded successfully" });
        resetForm();
        loadData();
      }
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsDialogOpen(false);
    setSelectedProductId('');
    setQuantity('1');
    setIsManualInput(false);
    setManualProductName('');
    setManualUnitPrice('');
    setManualCostPrice('');
  };

  const handleDeleteSale = async (id: string) => {
    if (await deleteSale(id)) {
      toast({ title: "Deleted", description: "Sale record removed" });
      loadData();
    }
  };

  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const dateLabel = isDaily ? "Today's" : "Selected Period";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales</h1>
          <p className="text-muted-foreground">{isDaily ? "Today's sales" : "Sales for selected period"}</p>
        </div>
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
                          {product.name} - {currency}{product.sellingPrice} (Stock: {product.stock})
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
                      <Label>Unit Price ({currency})</Label>
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
                      <Label>Cost Price ({currency})</Label>
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
                    <span className="font-medium">{currency}{selectedProduct.sellingPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg">{currency}{selectedProduct.sellingPrice * parseInt(quantity || '0')}</span>
                  </div>
                </div>
              )}

              {/* Summary for manual input */}
              {isManualInput && manualUnitPrice && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="font-medium">{currency}{parseFloat(manualUnitPrice) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg">{currency}{(parseFloat(manualUnitPrice) || 0) * parseInt(quantity || '0')}</span>
                  </div>
                  {manualCostPrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit:</span>
                      <span className="font-medium text-green-600">{currency}{((parseFloat(manualUnitPrice) || 0) - (parseFloat(manualCostPrice) || 0)) * parseInt(quantity || '0')}</span>
                    </div>
                  )}
                </div>
              )}
              <Button
                onClick={handleAddSale}
                disabled={isManualInput ? (!manualProductName || !manualUnitPrice || isLoading) : (!selectedProductId || isLoading)}
                className="w-full btn-primary-gradient"
              >
                Record Sale
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter />

      {/* Grand Totals - Profit only visible in Profit section */}
      <div className="grand-total-card">
        <p className="text-primary-foreground/80 text-sm">Total Sales</p>
        <p className="text-3xl font-bold">{currency}{totalSales.toLocaleString()}</p>
      </div>

      {/* Sales List - No profit column (profit only in Profit section) */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Qty</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No sales recorded yet</p>
                  </td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id} className="table-row-hover border-t border-border">
                    <td className="p-4 font-medium">{sale.productName}</td>
                    <td className="p-4">{sale.quantity}</td>
                    <td className="p-4">{currency}{sale.totalAmount.toLocaleString()}</td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(sale.date)}</td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSale(sale.id)}
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
