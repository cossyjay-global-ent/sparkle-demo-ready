import { ReactNode } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Receipt, 
  Users, 
  CreditCard, 
  BarChart3,
  FileText,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      {icon && (
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="w-4 h-4" />
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}

// Preset empty states for common pages
export function NoSales({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<ShoppingCart className="w-8 h-8 text-muted-foreground" />}
      title="No sales recorded"
      description="Start recording your sales to track revenue and inventory."
      actionLabel="Record Sale"
      onAction={onAdd}
    />
  );
}

export function NoProducts({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Package className="w-8 h-8 text-muted-foreground" />}
      title="No products yet"
      description="Add your first product to start managing your inventory."
      actionLabel="Add Product"
      onAction={onAdd}
    />
  );
}

export function NoExpenses({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Receipt className="w-8 h-8 text-muted-foreground" />}
      title="No expenses recorded"
      description="Track your business expenses to understand your costs."
      actionLabel="Add Expense"
      onAction={onAdd}
    />
  );
}

export function NoCustomers({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-muted-foreground" />}
      title="No customers yet"
      description="Add customers to manage their information and track debts."
      actionLabel="Add Customer"
      onAction={onAdd}
    />
  );
}

export function NoDebts({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<CreditCard className="w-8 h-8 text-muted-foreground" />}
      title="No debts recorded"
      description="Record debts when customers buy on credit."
      actionLabel="Add Debt"
      onAction={onAdd}
    />
  );
}

export function NoReports() {
  return (
    <EmptyState
      icon={<BarChart3 className="w-8 h-8 text-muted-foreground" />}
      title="Not enough data"
      description="Start recording sales and expenses to generate reports."
    />
  );
}

export function NoAuditLogs() {
  return (
    <EmptyState
      icon={<FileText className="w-8 h-8 text-muted-foreground" />}
      title="No audit logs yet"
      description="Actions you perform will be recorded here for accountability."
    />
  );
}

export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<FileText className="w-8 h-8 text-muted-foreground" />}
      title="No results found"
      description={`No items match "${query}". Try a different search term.`}
    />
  );
}
