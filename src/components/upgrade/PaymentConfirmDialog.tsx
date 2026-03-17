/**
 * PAYMENT CONFIRMATION DIALOG
 * Shows plan name, price, and billing cycle before initiating checkout.
 * Required for Google Play Store compliance.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Loader2 } from 'lucide-react';

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
  onConfirm: () => void;
  isLoading: boolean;
}

const PLAN_DETAILS: Record<string, { name: string; price: string; cycle: string; icon: typeof Crown }> = {
  pro: {
    name: 'Pro',
    price: '₦5,000',
    cycle: 'Monthly',
    icon: Crown,
  },
  business: {
    name: 'Admin',
    price: '₦15,000',
    cycle: 'Monthly',
    icon: Shield,
  },
};

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  planId,
  onConfirm,
  isLoading,
}: PaymentConfirmDialogProps) {
  const plan = planId ? PLAN_DETAILS[planId] : null;
  if (!plan) return null;

  const Icon = plan.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            Confirm Subscription
          </DialogTitle>
          <DialogDescription>
            Review your subscription details before proceeding to payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge variant="secondary">{plan.name}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="font-semibold text-foreground">{plan.price}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Billing Cycle</span>
              <span className="text-sm text-foreground">{plan.cycle}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            This subscription renews automatically unless cancelled. You can manage or cancel your subscription through your billing account.
          </p>

          <p className="text-xs text-muted-foreground text-center">
            You will be redirected to a secure payment page. By proceeding, you agree to our{' '}
            <a
              href="https://sparkle-demo-ready.lovable.app/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="https://sparkle-demo-ready.lovable.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              Privacy Policy
            </a>.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${plan.price}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
