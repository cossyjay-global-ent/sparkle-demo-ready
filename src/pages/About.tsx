import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ShoppingCart, Wifi, Shield, Smartphone, BarChart3, Users } from 'lucide-react';

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Wifi,
      title: 'Offline-First',
      description: 'Works without internet. All your data is stored locally and syncs when online.'
    },
    {
      icon: ShoppingCart,
      title: 'Sales Tracking',
      description: 'Record sales quickly, track inventory, and monitor your daily revenue.'
    },
    {
      icon: BarChart3,
      title: 'Reports & Analytics',
      description: 'Get insights into your business with detailed reports and profit analysis.'
    },
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Keep track of customers and manage credit/debt accounts efficiently.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your business data is encrypted and securely stored on your device.'
    },
    {
      icon: Smartphone,
      title: 'Mobile-Ready',
      description: 'Install on your phone for quick access. Works like a native app.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">About Offline POS</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Offline POS</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The complete point of sale solution for business owners. Track sales, manage inventory, 
            and grow your business - even without internet.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-medium">Version 1.0.0</span>
          </div>
        </section>

        {/* Features Grid */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="card-glass">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* App Info */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">App Information</h3>
          <Card className="card-glass">
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">App Name</span>
                <span className="font-medium">Offline POS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">Web, Android, iOS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offline Support</span>
                <span className="font-medium text-success">Enabled</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 py-8">
          <p className="text-muted-foreground">Ready to manage your business?</p>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="btn-primary-gradient px-8"
          >
            Go to Dashboard
          </Button>
        </section>
      </main>
    </div>
  );
};

export default About;