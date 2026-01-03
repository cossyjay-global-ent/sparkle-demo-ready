import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import { AppSidebar } from '@/components/AppSidebar';
import { Loader2 } from 'lucide-react';
import DashboardHome from '@/components/dashboard/DashboardHome';
import SalesPage from '@/components/dashboard/SalesPage';
import ProductsPage from '@/components/dashboard/ProductsPage';
import ExpensesPage from '@/components/dashboard/ExpensesPage';
import ProfitPage from '@/components/dashboard/ProfitPage';
import CustomersPage from '@/components/dashboard/CustomersPage';
import DebtsPage from '@/components/dashboard/DebtsPage';
import ReportsPage from '@/components/dashboard/ReportsPage';
import AuditLogsPage from '@/components/dashboard/AuditLogsPage';

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: rbacLoading } = useRBAC();

  const isLoading = authLoading || rbacLoading;

  // Only show loading during RBAC initialization (auth is already handled by ProtectedRoute)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 lg:ml-0 pt-14 lg:pt-0 overflow-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="profit" element={<ProfitPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="debts" element={<DebtsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
