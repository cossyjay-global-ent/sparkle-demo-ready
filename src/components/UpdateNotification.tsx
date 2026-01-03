import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // New service worker activated, page will reload
      window.location.reload();
    };

    // Listen for new service worker
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check for updates on mount
    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      
      // Check for waiting worker
      if (reg.waiting) {
        setShowUpdate(true);
      }

      // Listen for new updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        }
      });
    });

    // Periodic update check
    const checkInterval = setInterval(() => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update().catch(console.error);
      });
    }, 60 * 60 * 1000); // Check every hour

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearInterval(checkInterval);
    };
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">Update Available</p>
          <p className="text-sm text-muted-foreground mb-3">
            A new version is ready. Refresh to update.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpdate} className="gap-1">
              <RefreshCw className="w-3 h-3" />
              Update Now
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
