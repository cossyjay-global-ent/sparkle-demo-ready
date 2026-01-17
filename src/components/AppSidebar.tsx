import { useState, useEffect, forwardRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Shield,
  Settings,
  User,
  HelpCircle,
  Info,
  Download,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import { useCloudData } from '@/contexts/CloudDataContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const AppSidebar = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function AppSidebar(props, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [allTimeStats, setAllTimeStats] = useState({ totalSales: 0, totalExpenses: 0 });
  const [showAllTimeSummary, setShowAllTimeSummary] = useState(false);
  const { logout, isOnline } = useAuth();
  const { role, canViewProfit, canViewAuditLogs } = useRBAC();
  const { getSales, getExpenses, dataVersion } = useCloudData();
  const { currency } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();

  // CLOUD-SYNC-CRITICAL: Load all-time stats with real-time updates
  useEffect(() => {
    const loadAllTimeStats = async () => {
      const [sales, expenses] = await Promise.all([getSales(), getExpenses()]);
      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      setAllTimeStats({ totalSales, totalExpenses });
    };
    loadAllTimeStats();
  }, [getSales, getExpenses, dataVersion]);

  const formatCurrency = (amount: number) => {
    return `${currency.symbol}${amount.toLocaleString()}`;
  };

  // Check if app is in standalone mode (installed)
  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    
    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setCanInstall(false);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const mainNavItems = [
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

  // Only show Install App if not installed and can install
  const secondaryNavItems = [
    { path: '/settings', label: 'Settings', icon: Settings, show: true },
    { path: '/profile', label: 'Profile', icon: User, show: true },
    { path: '/install', label: 'Install App', icon: Download, show: !isStandalone && canInstall },
    { path: '/support', label: 'Help & Support', icon: HelpCircle, show: true },
    { path: '/about', label: 'About', icon: Info, show: true },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="lg:hidden text-foreground"
        >
          <Menu className="w-6 h-6 text-foreground" />
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
        "fixed left-0 top-0 h-full w-64 bg-white dark:bg-card border-r border-sidebar-border z-50 transition-transform duration-300 ease-out lg:translate-x-0 lg:static flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-sidebar-foreground">Offline POS</h2>
              {role && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                  {role}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-sidebar-foreground hover:bg-primary/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sync Status */}
        <div className="px-4 py-3 border-b border-sidebar-border flex-shrink-0">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium w-full justify-center",
            isOnline ? "bg-success/10 text-success" : "bg-warning/20 text-warning"
          )}>
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

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          <p className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-2 px-3">
            Main Menu
          </p>
          {mainNavItems.filter(item => item.show).map((item) => (
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

          <Separator className="my-4 bg-sidebar-border" />

          <p className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-2 px-3">
            More
          </p>
          {secondaryNavItems.filter(item => item.show).map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "nav-link w-full",
                isActive(item.path) && "active"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* All-Time Summary - Collapsible */}
        <div className="px-4 py-3 border-t border-sidebar-border flex-shrink-0">
          <button
            onClick={() => setShowAllTimeSummary(!showAllTimeSummary)}
            className="flex items-center justify-between w-full text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
          >
            <span>All-Time Summary</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showAllTimeSummary && "rotate-180")} />
          </button>
          {showAllTimeSummary && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-success/10">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-success" />
                  <span className="text-xs text-sidebar-foreground">Sales</span>
                </div>
                <span className="text-sm font-semibold text-success">{formatCurrency(allTimeStats.totalSales)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-warning/10">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-warning" />
                  <span className="text-xs text-sidebar-foreground">Expenses</span>
                </div>
                <span className="text-sm font-semibold text-warning">{formatCurrency(allTimeStats.totalExpenses)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <Button
            variant="outline"
            className="w-full mb-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary bg-transparent"
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
});

AppSidebar.displayName = 'AppSidebar';