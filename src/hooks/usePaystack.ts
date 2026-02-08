/**
 * PAYSTACK INTEGRATION HOOK
 * Handles Paystack inline checkout for subscription payments.
 * 
 * Phase 3A: Records payments without auto-upgrading subscriptions.
 * Subscription upgrades will be enabled in Phase 3B.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Plan pricing in kobo (NGN smallest unit)
const PLAN_PRICES: Record<string, number> = {
  pro: 500000,      // ₦5,000
  business: 1500000, // ₦15,000
};

interface PaymentResult {
  success: boolean;
  reference?: string;
  message?: string;
}

interface PaystackResponse {
  reference: string;
  status: string;
  trans: string;
  transaction: string;
  message: string;
}

// Extend window to include PaystackPop
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: PaystackConfig) => { openIframe: () => void };
    };
  }
}

interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  metadata: {
    plan: string;
    user_id: string;
  };
  callback: (response: PaystackResponse) => void;
  onClose: () => void;
}

export function usePaystack() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Paystack script dynamically
  const loadPaystackScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        setIsScriptLoaded(true);
        resolve();
        return;
      }

      const existingScript = document.getElementById('paystack-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setIsScriptLoaded(true);
          resolve();
        });
        return;
      }

      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      
      script.onload = () => {
        setIsScriptLoaded(true);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Paystack script'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  // Generate unique reference
  const generateReference = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `PAY-${timestamp}-${random}`;
  }, []);

  // Create pending payment record
  const createPaymentRecord = useCallback(async (
    plan: string,
    amount: number,
    reference: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('payment_records')
        .insert({
          user_id: user.id,
          email: user.email || '',
          plan,
          amount,
          reference,
          status: 'pending',
          metadata: { initiated_at: new Date().toISOString() }
        });

      if (error) {
        console.error('[Paystack] Failed to create payment record:', error);
        return false;
      }

      console.log('[Paystack] Payment record created:', reference);
      return true;
    } catch (err) {
      console.error('[Paystack] Error creating payment record:', err);
      return false;
    }
  }, [user]);

  // Update payment record status
  const updatePaymentStatus = useCallback(async (
    reference: string,
    status: 'success' | 'failed' | 'cancelled',
    paystackReference?: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('payment_records')
        .update({
          status,
          paystack_reference: paystackReference,
          metadata: { 
            completed_at: new Date().toISOString(),
            final_status: status
          }
        })
        .eq('reference', reference);

      if (error) {
        console.error('[Paystack] Failed to update payment status:', error);
      } else {
        console.log('[Paystack] Payment status updated:', reference, status);
      }
    } catch (err) {
      console.error('[Paystack] Error updating payment status:', err);
    }
  }, []);

  // Initiate payment
  const initiatePayment = useCallback(async (plan: string): Promise<PaymentResult> => {
    if (!user || !user.email) {
      toast({
        title: 'Error',
        description: 'Please log in to continue with payment.',
        variant: 'destructive'
      });
      return { success: false, message: 'User not authenticated' };
    }

    const amount = PLAN_PRICES[plan];
    if (!amount) {
      toast({
        title: 'Error',
        description: 'Invalid plan selected.',
        variant: 'destructive'
      });
      return { success: false, message: 'Invalid plan' };
    }

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      console.error('[Paystack] Public key not configured');
      toast({
        title: 'Configuration Error',
        description: 'Payment system is not properly configured. Please contact support.',
        variant: 'destructive'
      });
      return { success: false, message: 'Paystack not configured' };
    }

    setIsLoading(true);

    try {
      // Load Paystack script if not already loaded
      await loadPaystackScript();

      if (!window.PaystackPop) {
        throw new Error('Paystack failed to initialize');
      }

      const reference = generateReference();

      // Create pending payment record first
      const recordCreated = await createPaymentRecord(plan, amount, reference);
      if (!recordCreated) {
        throw new Error('Failed to initialize payment');
      }

      // Return a promise that resolves when payment completes
      return new Promise((resolve) => {
        const handler = window.PaystackPop!.setup({
          key: publicKey,
          email: user.email!,
          amount,
          currency: 'NGN',
          ref: reference,
          metadata: {
            plan,
            user_id: user.id
          },
          callback: async (response: PaystackResponse) => {
            console.log('[Paystack] Payment successful:', response);
            
            // Update payment record to success
            await updatePaymentStatus(reference, 'success', response.reference);
            
            toast({
              title: 'Payment Successful!',
              description: `Your payment for the ${plan === 'business' ? 'Admin' : 'Pro'} plan has been received. Your subscription will be activated shortly.`
            });
            
            setIsLoading(false);
            resolve({ success: true, reference: response.reference });
          },
          onClose: async () => {
            console.log('[Paystack] Payment dialog closed');
            
            // Check if payment was completed before closing
            // If not, mark as cancelled
            const { data } = await supabase
              .from('payment_records')
              .select('status')
              .eq('reference', reference)
              .single();

            if (data?.status === 'pending') {
              await updatePaymentStatus(reference, 'cancelled');
              toast({
                title: 'Payment Cancelled',
                description: 'You cancelled the payment. No charges were made.',
                variant: 'destructive'
              });
            }
            
            setIsLoading(false);
            resolve({ success: false, message: 'Payment cancelled' });
          }
        });

        handler.openIframe();
      });

    } catch (error) {
      console.error('[Paystack] Payment error:', error);
      setIsLoading(false);
      
      toast({
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
      
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [user, toast, loadPaystackScript, generateReference, createPaymentRecord, updatePaymentStatus]);

  return {
    initiatePayment,
    isLoading,
    isScriptLoaded
  };
}
