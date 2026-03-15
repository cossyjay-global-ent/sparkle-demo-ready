/**
 * TERMS OF SERVICE PAGE
 * Required for Google Play Store compliance.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-6 text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 15, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using this application, you agree to be bound by these Terms of Service. If you do not agree, you may not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
            <p className="text-muted-foreground">
              This application is a business and SaaS management tool that helps you track sales, expenses, products, customers, and debts. It provides cloud synchronization, analytics, and reporting features based on your subscription plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Subscriptions and Payments</h2>
            <p className="text-muted-foreground">
              The application offers Free, Pro, and Admin subscription tiers. Paid subscriptions are billed monthly in Nigerian Naira (NGN) via Paystack. Subscription fees are non-refundable except as required by applicable law. You may cancel your subscription at any time; access continues until the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. User Responsibilities</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to provide accurate information and to use the application only for lawful business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Data Ownership</h2>
            <p className="text-muted-foreground">
              You retain full ownership of all business data you enter into the application. We do not claim any intellectual property rights over your content. You may export or delete your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              The application is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability is limited to the amount you paid for the service in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your account if you violate these terms. Upon termination, your right to use the application ceases immediately. You may request data export before account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at support@example.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
