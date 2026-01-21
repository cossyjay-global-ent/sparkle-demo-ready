/**
 * SUBSCRIPTION GATE COMPONENT
 * Wraps protected pages/features and redirects to upgrade if plan insufficient.
 * 
 * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
 * Developer account bypasses all subscription gates.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSubscription, SubscriptionPlan } from '@/contexts/SubscriptionContext';
import { Loader2 } from 'lucide-react';

interface RequireSubscriptionProps {
  plan: SubscriptionPlan;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireSubscription({ plan, children, fallback }: RequireSubscriptionProps) {
  const location = useLocation();
  const { 
    plan: currentPlan, 
    isLoading, 
    isDeveloper,
    isPro,
    isBusiness 
  } = useSubscription();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  /**
   * DEVELOPER LIFETIME ACCESS – DO NOT REMOVE
   * Developer bypasses all subscription checks
   */
  if (isDeveloper) {
    return <>{children}</>;
  }

  // Check if user has required plan level
  const hasAccess = (() => {
    switch (plan) {
      case 'free':
        return true;
      case 'pro':
        return isPro || isBusiness;
      case 'business':
        return isBusiness;
      default:
        return false;
    }
  })();

  if (!hasAccess) {
    // If fallback provided, render it instead of redirecting
    if (fallback) {
      return <>{fallback}</>;
    }
    // Redirect to upgrade page with return URL
    return <Navigate to="/upgrade" state={{ from: location, requiredPlan: plan }} replace />;
  }

  return <>{children}</>;
}
