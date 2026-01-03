import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  ArrowRight, 
  Wifi, 
  WifiOff, 
  Package, 
  BarChart3, 
  Users,
  Shield,
  Smartphone,
  Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user, isOnline } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    { icon: ShoppingCart, title: 'Sales Tracking', description: 'Record sales instantly' },
    { icon: Package, title: 'Inventory', description: 'Manage your products' },
    { icon: BarChart3, title: 'Reports', description: 'Business analytics' },
    { icon: Users, title: 'Customers', description: 'Track debts & credits' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">Offline POS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`sync-indicator ${isOnline ? 'sync-online' : 'sync-offline'}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center max-w-lg animate-fade-in space-y-6">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <ShoppingCart className="w-12 h-12 text-primary-foreground" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Offline POS
            </h1>
            <p className="text-xl text-primary font-medium">
              For Smart Business Owners
            </p>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            The complete point of sale solution. Track sales, manage inventory, and grow your business - even without internet!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              onClick={() => navigate('/auth')}
              className="btn-primary-gradient px-8 py-6 text-lg rounded-xl"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/install')}
              className="px-8 py-6 text-lg rounded-xl"
            >
              <Download className="mr-2 w-5 h-5" />
              Install App
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full max-w-3xl">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-4 rounded-xl bg-card border border-border text-center hover:border-primary/50 transition-colors"
            >
              <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-success" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-primary" />
            <span>Works Offline</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <span>Install on Phone</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-4 py-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Offline POS. All rights reserved.</p>
          <div className="flex gap-4">
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate('/about')}>
              About
            </Button>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate('/support')}>
              Support
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;