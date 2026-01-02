import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  User,
  Mail,
  Calendar,
  Shield,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useRBAC();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || 'User');

  const handleSave = () => {
    // In production, this would update the profile
    toast.success('Profile updated successfully');
    setIsEditing(false);
  };

  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const formatDate = (date: string | number | undefined) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'number' ? new Date(date) : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-lg">Profile</h1>
          </div>
          {!isEditing ? (
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Edit className="w-5 h-5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSave}>
                <Save className="w-5 h-5 text-primary" />
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Header */}
        <section className="text-center space-y-4">
          <Avatar className="w-24 h-24 mx-auto border-4 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {getInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
          
          {isEditing ? (
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="max-w-xs mx-auto text-center text-xl font-bold"
            />
          ) : (
            <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
          )}
          
          {role && (
            <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-sm">
              {role === 'admin' ? 'Administrator' : 'Staff Member'}
            </Badge>
          )}
        </section>

        {/* Account Information */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Account Information
          </h3>
          
          <Card className="card-glass">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <p className="font-medium">{user?.email || 'Not available'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Role
                </Label>
                <p className="font-medium capitalize">{role || 'User'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Member Since
                </Label>
                <p className="font-medium">{formatDate(user?.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Security */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Security
          </h3>
          
          <Card className="card-glass">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-sm text-muted-foreground">Last changed: Unknown</p>
                </div>
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                </div>
                <Badge variant="outline">Not Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-4 pt-4">
          <Button variant="outline" onClick={() => navigate('/settings')} className="h-auto py-4">
            Settings
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-auto py-4">
            Dashboard
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Profile;