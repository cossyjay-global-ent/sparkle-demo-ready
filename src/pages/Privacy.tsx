/**
 * PRIVACY POLICY PAGE
 * Publicly accessible HTTPS URL required for Google Play Store compliance.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-6 text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 15, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide when creating an account (email address, display name) and data you enter while using the application (sales records, expenses, products, customer details, and debt records). We also collect usage data such as device type, browser, and interaction patterns to improve our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              Your data is used to provide and maintain the application, process subscription payments, synchronize your business data across devices, send important service notifications, and improve our product. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Data Storage and Security</h2>
            <p className="text-muted-foreground">
              Your data is stored securely using industry-standard encryption and access controls. We use secure cloud infrastructure with row-level security to ensure your business data is only accessible to you and authorized team members.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Payment Information</h2>
            <p className="text-muted-foreground">
              Subscription payments are processed by Paystack, a PCI-DSS compliant payment processor. We do not store your card details. Payment references and transaction metadata are stored securely for billing history purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Data Sharing</h2>
            <p className="text-muted-foreground">
              We only share your information with payment processors (Paystack) for transaction processing, cloud infrastructure providers for data hosting, and as required by applicable law. We do not share your business data with any other third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, update, or delete your personal data at any time through the application settings. You may also request a copy of your data or ask us to delete your account by contacting our support team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us at support@example.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
