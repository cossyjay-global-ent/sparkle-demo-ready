import { WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function OfflineIndicator() {
  const { isOnline } = useAuth();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-warning text-warning-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        <span>You're offline</span>
      </div>
    </div>
  );
}
