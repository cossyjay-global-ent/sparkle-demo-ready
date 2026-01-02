import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Settings as SettingsIcon,
  Bell,
  Moon,
  Smartphone,
  Shield,
  Database,
  RefreshCw,
  Trash2,
  Download,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { isOnline } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
      toast.success('Cache cleared successfully');
    }
  };

  const handleExportData = () => {
    toast.success('Data export started. Check your downloads.');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* App Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">App Settings</h2>
          </div>
          
          <Card className="card-glass">
            <CardContent className="pt-6 space-y-6">
              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts and updates</p>
                  </div>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>

              {/* Auto Sync */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Auto Sync</Label>
                    <p className="text-sm text-muted-foreground">Sync data when online</p>
                  </div>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>

              {/* Dark Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Switch to dark theme</p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Management */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Data Management</h2>
          </div>
          
          <Card className="card-glass">
            <CardContent className="pt-6 space-y-4">
              {/* Export Data */}
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleExportData}
              >
                <Download className="w-4 h-4 mr-3" />
                Export Data
              </Button>

              {/* Clear Cache */}
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleClearCache}
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Clear Cache
              </Button>

              {/* Sync Status */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-4 h-4 ${isOnline ? 'text-success' : 'text-muted-foreground'}`} />
                  <span className="text-sm">Sync Status</span>
                </div>
                <span className={`text-sm font-medium ${isOnline ? 'text-success' : 'text-warning'}`}>
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Security */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Security</h2>
          </div>
          
          <Card className="card-glass">
            <CardContent className="pt-6 space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/profile')}
              >
                <Shield className="w-4 h-4 mr-3" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* App Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">App Info</h2>
          </div>
          
          <Card className="card-glass">
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build</span>
                <span className="font-medium">Production</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">Calculating...</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-2 gap-4 pt-4">
          <Button variant="outline" onClick={() => navigate('/about')} className="h-auto py-4">
            <Info className="w-4 h-4 mr-2" />
            About
          </Button>
          <Button variant="outline" onClick={() => navigate('/support')} className="h-auto py-4">
            <Smartphone className="w-4 h-4 mr-2" />
            Support
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Settings;