import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Receipt, 
  TrendingUp,
  Users,
  CreditCard,
  BarChart3,
  Menu,
  X,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, isOnline } = useAuth();
  const { role, canViewProfit, canViewAuditLogs } = useRBAC();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/dashboard/sales', label: 'Sales', icon: ShoppingCart, show: true },
    { path: '/dashboard/products', label: 'Products', icon: Package, show: true },
    { path: '/dashboard/expenses', label: 'Expenses', icon: Receipt, show: true },
    { path: '/dashboard/profit', label: 'Profit', icon: TrendingUp, show: canViewProfit },
    { path: '/dashboard/customers', label: 'Customers', icon: Users, show: true },
    { path: '/dashboard/debts', label: 'Debts', icon: CreditCard, show: true },
    { path: '/dashboard/reports', label: 'Reports', icon: BarChart3, show: true },
    { path: '/dashboard/audit-logs', label: 'Audit Logs', icon: Shield, show: canViewAuditLogs },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <h1 className="font-semibold text-foreground">Offline POS</h1>
        <div className={`sync-indicator ${isOnline ? 'sync-online' : 'sync-offline'}`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        </div>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar-background border-r border-sidebar-border z-50 transition-transform duration-300 ease-out lg:translate-x-0 lg:static",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-sidebar-foreground">Offline POS</h2>
            {role && (
              <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                {role}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sync Status */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className={`sync-indicator w-full justify-center ${isOnline ? 'sync-online' : 'sync-offline'}`}>
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline Mode</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.filter(item => item.show).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={() => setIsOpen(false)}
              className={cn(
                "nav-link",
                isActive(item.path) && "active"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sync Button */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="outline"
            className="w-full mb-2"
            disabled={!isOnline}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Now
          </Button>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
