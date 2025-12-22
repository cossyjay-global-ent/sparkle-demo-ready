import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowRight, Wifi, WifiOff } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header stripe */}
      <div className="h-2 w-full bg-gradient-to-r from-primary to-primary/70" />

      {/* Online status */}
      <div className="absolute top-4 right-4">
        <div className={`sync-indicator ${isOnline ? 'sync-online' : 'sync-offline'}`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-fade-in">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <ShoppingCart className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Offline POS
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-primary font-medium mb-4">
            For Lagos Traders
          </p>

          {/* Description */}
          <p className="text-muted-foreground mb-8">
            Record your sales. Track your business. No internet needed!
          </p>

          {/* CTA Button */}
          <Button
            onClick={() => navigate('/auth')}
            className="btn-primary-gradient px-8 py-6 text-lg rounded-xl"
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
