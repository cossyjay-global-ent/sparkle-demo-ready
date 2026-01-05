import { useState, useEffect } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Package, Trash2, Edit2 } from 'lucide-react';
import { Product, now } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const { getProducts, addProduct, updateProduct, deleteProduct } = useData();
  const { currency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    category: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = currency.symbol;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  const resetForm = () => {
    setFormData({ name: '', costPrice: '', sellingPrice: '', stock: '', category: '' });
    setEditingProduct(null);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        stock: product.stock.toString(),
        category: product.category || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.costPrice || !formData.sellingPrice || !formData.stock) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    if (editingProduct) {
      const success = await updateProduct(editingProduct.id, {
        name: formData.name,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        stock: parseInt(formData.stock),
        category: formData.category || undefined
      });
      if (success) {
        toast({ title: "Success", description: "Product updated" });
      }
    } else {
      const product = await addProduct({
        name: formData.name,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        stock: parseInt(formData.stock),
        category: formData.category || undefined
      });
      if (product) {
        toast({ title: "Success", description: "Product added" });
      }
    }

    setIsDialogOpen(false);
    resetForm();
    loadProducts();
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (await deleteProduct(id)) {
      toast({ title: "Deleted", description: "Product removed" });
      loadProducts();
    }
  };

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalValue = products.reduce((sum, p) => sum + (p.sellingPrice * p.stock), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-primary-gradient" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Rice (50kg)"
                  className="input-styled"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost Price *</Label>
                  <Input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0"
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price *</Label>
                  <Input
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0"
                    className="input-styled"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Quantity *</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Groceries"
                    className="input-styled"
                  />
                </div>
              </div>
              {formData.costPrice && formData.sellingPrice && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit per unit:</span>
                    <span className="font-bold text-success">
                      {currencySymbol}{(parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full btn-primary-gradient"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold">{totalProducts}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Total Stock</p>
          <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
        </Card>
        <Card className="stat-card">
          <p className="text-sm text-muted-foreground">Stock Value</p>
          <p className="text-2xl font-bold">{currencySymbol}{totalValue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length === 0 ? (
          <Card className="col-span-full p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No products added yet</p>
          </Card>
        ) : (
          products.map(product => (
            <Card key={product.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  {product.category && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{product.category}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Cost</p>
                  <p className="font-medium">{currencySymbol}{product.costPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">{currencySymbol}{product.sellingPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stock</p>
                  <p className={`font-medium ${product.stock < 10 ? 'text-warning' : ''}`}>{product.stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profit</p>
                  <p className="font-medium text-success">{currencySymbol}{(product.sellingPrice - product.costPrice).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
