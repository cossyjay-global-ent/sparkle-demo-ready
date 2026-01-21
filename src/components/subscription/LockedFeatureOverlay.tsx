/**
 * LOCKED FEATURE OVERLAY
 * Displayed when user tries to access a feature locked behind subscription.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionPlan } from '@/contexts/SubscriptionContext';

interface LockedFeatureOverlayProps {
  feature: string;
  requiredPlan: SubscriptionPlan;
  description?: string;
}

export function LockedFeatureOverlay({ 
  feature, 
  requiredPlan, 
  description 
}: LockedFeatureOverlayProps) {
  const planLabel = requiredPlan === 'business' ? 'Admin' : 'Pro';
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{feature} is Locked</CardTitle>
          <CardDescription>
            {description || `This feature requires a ${planLabel} subscription to access.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Crown className="w-4 h-4 text-primary" />
              <span>Upgrade to {planLabel} to unlock</span>
            </div>
          </div>
          
          <Button asChild className="w-full">
            <Link to="/upgrade">
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Get access to advanced features and grow your business
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
