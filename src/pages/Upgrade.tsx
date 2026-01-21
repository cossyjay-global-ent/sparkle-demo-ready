/**
 * UPGRADE PAGE
 * Shows subscription plans and benefits.
 * Paystack-ready for Nigeria payments.
 * 
 * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
 * Developer sees confirmation of lifetime access.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Crown, 
  Star, 
  ArrowLeft, 
  Sparkles,
  BarChart3,
  Users,
  Clock,
  Shield,
  Zap
} from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₦0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Daily Dashboard',
      'Sales Tracking',
      'Expense Management',
      'Basic Cloud Sync',
      'PWA Support',
    ],
    limitations: [
      'No Profit Analytics',
      'No Historical Reports',
      'Daily Mode Only',
    ],
    icon: Star,
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦5,000',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Everything in Free',
      'Profit Page Access',
      'Full Reports & Analytics',
      'Historical Data Access',
      'Custom Date Ranges',
      'Real-time Multi-device Sync',
      'Priority Support',
    ],
    limitations: [],
    icon: Crown,
    popular: true,
  },
  {
    id: 'business',
    name: 'Admin',
    price: '₦15,000',
    period: '/month',
    description: 'For teams & enterprises',
    features: [
      'Everything in Pro',
      'Audit Logs',
      'Role Management',
      'Date Authority Controls',
      'Multi-user Support',
      'Advanced Security',
      'Dedicated Support',
    ],
    limitations: [],
    icon: Shield,
    popular: false,
  },
];

export default function Upgrade() {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan: currentPlan, isDeveloper, isPro, isBusiness } = useSubscription();
  
  const requiredPlan = (location.state as any)?.requiredPlan;
  const fromPath = (location.state as any)?.from?.pathname;

  // DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
  if (isDeveloper) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Card className="border-primary">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              <Badge className="mx-auto mb-2 bg-primary">Developer Account</Badge>
              <CardTitle className="text-2xl">Lifetime Full Access</CardTitle>
              <CardDescription>
                You have permanent access to all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  As the developer, you have unrestricted access to every feature 
                  without any subscription requirements. This access never expires.
                </p>
              </div>
              <Button 
                className="w-full" 
                onClick={() => navigate(fromPath || '/dashboard')}
              >
                Continue to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleUpgrade = (planId: string) => {
    // TODO: Integrate Paystack payment
    // This will be implemented when Paystack is connected
    console.log('Upgrade to:', planId);
    // For now, show coming soon message
    alert('Payment integration coming soon! Contact support for manual upgrade.');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Upgrade Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {requiredPlan 
              ? `You need a ${requiredPlan === 'business' ? 'Admin' : 'Pro'} plan to access this feature.`
              : 'Choose the plan that best fits your business needs.'}
          </p>
        </div>

        {/* Current Plan Badge */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="text-sm px-4 py-1">
            Current Plan: {currentPlan === 'business' ? 'Admin' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
          </Badge>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map((planItem) => {
            const Icon = planItem.icon;
            const isCurrentPlan = currentPlan === planItem.id;
            const isHighlighted = requiredPlan === planItem.id;
            
            return (
              <Card 
                key={planItem.id}
                className={`relative ${planItem.popular ? 'border-primary shadow-lg' : ''} ${isHighlighted ? 'ring-2 ring-primary' : ''}`}
              >
                {planItem.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                    planItem.popular ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`w-7 h-7 ${planItem.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <CardTitle className="text-xl">{planItem.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{planItem.price}</span>
                    <span className="text-muted-foreground">{planItem.period}</span>
                  </div>
                  <CardDescription className="mt-2">
                    {planItem.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {planItem.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {planItem.limitations.map((limitation, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-4 h-4 shrink-0" />
                        <span className="line-through">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : planItem.popular ? 'default' : 'secondary'}
                    disabled={isCurrentPlan || (planItem.id === 'free')}
                    onClick={() => handleUpgrade(planItem.id)}
                  >
                    {isCurrentPlan ? 'Current Plan' : planItem.id === 'free' ? 'Free Forever' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="bg-muted/30 rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-6 text-center">Why Upgrade?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Profit Analytics</h3>
              <p className="text-sm text-muted-foreground">
                See exactly how much you're making
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Historical Data</h3>
              <p className="text-sm text-muted-foreground">
                Access all your past records
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Real-time Sync</h3>
              <p className="text-sm text-muted-foreground">
                Instant updates across all devices
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Team Features</h3>
              <p className="text-sm text-muted-foreground">
                Add staff and manage roles
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Have questions? Contact us at support@example.com
          </p>
        </div>
      </div>
    </div>
  );
}
