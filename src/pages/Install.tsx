import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Smartphone, Check, Share, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">App Installed!</h1>
          <p className="text-muted-foreground mb-6">
            Offline POS is now installed on your device. You can access it from your home screen.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Open Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Install Offline POS</h1>
          <p className="text-muted-foreground">
            Add to your home screen for the best experience with offline support.
          </p>
        </div>

        {deferredPrompt && (
          <Button onClick={handleInstall} className="w-full mb-4" size="lg">
            <Download className="mr-2 h-5 w-5" />
            Add to Home Screen
          </Button>
        )}

        {isIOS && !deferredPrompt && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Install on iPhone/iPad:</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <p className="font-medium">Tap the Share button</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Share className="w-4 h-4" /> at the bottom of Safari
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <p className="font-medium">Scroll down and tap</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Plus className="w-4 h-4" /> "Add to Home Screen"
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <p className="font-medium">Tap "Add" to confirm</p>
              </div>
            </div>
          </div>
        )}

        {isAndroid && !deferredPrompt && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Install on Android:</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <p className="font-medium">Tap the menu button (⋮) in Chrome</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <p className="font-medium">Tap "Add to Home screen"</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <p className="font-medium">Tap "Add" to confirm</p>
              </div>
            </div>
          </div>
        )}

        {!isIOS && !isAndroid && !deferredPrompt && (
          <div className="text-center text-muted-foreground">
            <p>Open this page on your mobile device to install the app.</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-semibold text-foreground mb-3">Benefits:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Works offline - no internet required
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Fast loading from home screen
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Full-screen experience
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Automatic data sync when online
            </li>
          </ul>
        </div>

        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="w-full mt-6"
        >
          Continue in Browser
        </Button>
      </Card>
    </div>
  );
}
