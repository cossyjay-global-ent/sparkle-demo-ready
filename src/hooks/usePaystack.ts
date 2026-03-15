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

// Paystack key is fetched at runtime from the backend
let cachedPaystackKey: string | null = null;
const FETCH_TIMEOUT_MS = 10000;

async function fetchPaystackKey(): Promise<string | null> {
  if (cachedPaystackKey) return cachedPaystackKey;

  try {
    const { supabase } = await import('@/integrations/supabase/client');

    // Timeout guard: abort if key fetch takes too long
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let data: Record<string, unknown> | null = null;
    let error: Error | null = null;

    try {
      const result = await supabase.functions.invoke('get-paystack-key');
      data = result.data;
      error = result.error as Error | null;
    } finally {
      clearTimeout(timeout);
    }

    if (error || !data?.key) {
      console.error('[Paystack] Paystack public key could not be loaded.', error || 'No key returned');
      return null;
    }

    const key = data.key as string;

    // Key validation: must be a string starting with "pk_" and reasonable length
    if (typeof key !== 'string' || !key.startsWith('pk_') || key.length < 10 || key.length > 100) {
      console.error('[Paystack] Paystack public key failed validation — invalid format.');
      return null;
    }

    cachedPaystackKey = key;
    return cachedPaystackKey;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[Paystack] Paystack public key fetch timed out.');
    } else {
      console.error('[Paystack] Paystack public key could not be loaded.', err);
    }
    return null;
  }
}

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

// Secure random hex string generation
function secureRandomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

// Detect if running inside a restricted WebView (Capacitor, Cordova, etc.)
function isRestrictedWebView(): boolean {
  const ua = navigator.userAgent || '';
  // Capacitor or Cordova wrapper
  if ((window as any).Capacitor || (window as any).cordova) return true;
  // Android WebView
  if (/wv/.test(ua) && /Android/.test(ua)) return true;
  // Generic WebView indicators
  if (/WebView/.test(ua)) return true;
  return false;
}

// Open URL in system browser when inside a WebView
function openInSystemBrowser(url: string): void {
  if ((window as any).Capacitor?.Plugins?.Browser) {
    (window as any).Capacitor.Plugins.Browser.open({ url });
  } else {
    // Fallback: window.open with _system target (Cordova InAppBrowser convention)
    window.open(url, '_system');
  }
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

  // Generate secure unique reference: pay_{userId}_{timestamp}_{secureRandom}
  const generateReference = useCallback((userId: string) => {
    const timestamp = Date.now();
    const random = secureRandomHex(6);
    return `pay_${userId.slice(0, 8)}_${timestamp}_${random}`;
  }, []);

  // Check for existing pending payment to prevent duplicates
  const findExistingPendingPayment = useCallback(async (
    plan: string
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('reference')
        .eq('user_id', user.id)
        .eq('plan', plan)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[Paystack] Error checking pending payments:', error);
        return null;
      }

      return data?.reference ?? null;
    } catch (err) {
      console.error('[Paystack] Error in findExistingPendingPayment:', err);
      return null;
    }
  }, [user]);

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

    // Fetch Paystack key from backend
    const paystackKey = await fetchPaystackKey();
    if (!paystackKey) {
      console.error('[Paystack] Paystack public key missing. Check VITE_PAYSTACK_PUBLIC_KEY secret.');
      toast({
        title: 'Configuration Error',
        description: 'Payment system is not properly configured.',
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

      // DUPLICATE PREVENTION: Check for existing pending payment for this plan
      let reference = await findExistingPendingPayment(plan);

      if (reference) {
        console.log('[Paystack] Reusing existing pending payment:', reference);
      } else {
        // Generate secure reference and create new record
        reference = generateReference(user.id);
        const recordCreated = await createPaymentRecord(plan, amount, reference);
        if (!recordCreated) {
          throw new Error('Failed to initialize payment');
        }
      }

      // Return a promise that resolves when payment completes
      return new Promise((resolve) => {
        const handler = window.PaystackPop!.setup({
          key: paystackKey,
          email: user.email!,
          amount,
          currency: 'NGN',
          ref: reference!,
          metadata: {
            plan,
            user_id: user.id
          },
          callback: (response: PaystackResponse) => {
            console.log('[Paystack] Payment successful:', response);
            
            // Update payment record to success (fire-and-forget)
            updatePaymentStatus(reference!, 'success', response.reference);
            
            toast({
              title: 'Payment Successful!',
              description: `Your payment for the ${plan === 'business' ? 'Admin' : 'Pro'} plan has been received. Your subscription will be activated shortly.`
            });
            
            setIsLoading(false);
            resolve({ success: true, reference: response.reference });
          },
          onClose: () => {
            console.log('[Paystack] Payment dialog closed');
            
            // ABANDONED PAYMENT HANDLING: resolve pending to cancelled (fire-and-forget)
            Promise.resolve(
              supabase
                .from('payment_records')
                .select('status')
                .eq('reference', reference!)
                .single()
            ).then(({ data }) => {
              if (data?.status === 'pending') {
                updatePaymentStatus(reference!, 'cancelled');
                toast({
                  title: 'Payment Cancelled',
                  description: 'You cancelled the payment. No charges were made.',
                  variant: 'destructive'
                });
              }
            }).catch((err) => {
              console.error('[Paystack] Error resolving abandoned payment:', err);
            });
            
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
  }, [user, toast, loadPaystackScript, generateReference, findExistingPendingPayment, createPaymentRecord, updatePaymentStatus]);

  return {
    initiatePayment,
    isLoading,
    isScriptLoaded
  };
}
