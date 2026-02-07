import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DebtReminder {
  id: string;
  debt_id: string;
  user_id: string;
  reminder_day: number;
  scheduled_at: string;
  status: string;
}

interface Debt {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  paid_amount: number;
  date: string;
  user_id: string;
}

interface Profile {
  display_name: string | null;
}

// Generate reminder message based on debt status and days
function generateReminderMessage(
  customerName: string,
  totalAmount: number,
  paidAmount: number,
  balance: number,
  businessName: string,
  currencySymbol: string,
  daysOutstanding: number
): string {
  const formatAmount = (amount: number) => 
    `${currencySymbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const safeBusinessName = businessName || 'My Business';

  // Overdue message (14+ days)
  if (daysOutstanding >= 14) {
    return `Hello ${customerName},

We hope this message finds you well.

This is a gentle follow-up regarding your outstanding balance with us.

Payment Summary:
Total Amount: ${formatAmount(totalAmount)}
${paidAmount > 0 ? `Amount Paid: ${formatAmount(paidAmount)}\n` : ''}Outstanding Balance: ${formatAmount(balance)}
Days Outstanding: ${daysOutstanding}

We understand that circumstances may vary, and we are happy to discuss flexible payment arrangements if needed.

Your prompt attention to this matter would be greatly appreciated.

Please do not hesitate to reach out if you have any questions or concerns.

Best regards,
${safeBusinessName}`;
  }

  // Partial payment reminder
  if (paidAmount > 0) {
    return `Hello ${customerName},

Thank you for your partial payment.

Payment Summary:
Total Amount: ${formatAmount(totalAmount)}
Amount Paid: ${formatAmount(paidAmount)}
Outstanding Balance: ${formatAmount(balance)}

We kindly request that the remaining balance be settled at your convenience.

Please let us know when the final payment will be completed.

Thank you for your continued cooperation.

Best regards,
${safeBusinessName}`;
  }

  // Outstanding debt reminder
  return `Hello ${customerName},

This is a polite reminder regarding your outstanding payment with us.

Total Amount: ${formatAmount(totalAmount)}
Outstanding Balance: ${formatAmount(balance)}

We kindly request that payment be made at your earliest convenience.

Please let us know if you have any questions or need clarification.

Best regards,
${safeBusinessName}`;
}

// Sanitize phone number for WhatsApp
function sanitizePhoneNumber(phone: string): string {
  let sanitized = phone.replace(/[^\d+]/g, '');
  if (sanitized.startsWith('0')) {
    sanitized = '234' + sanitized.slice(1);
  }
  if (sanitized.startsWith('+')) {
    sanitized = sanitized.slice(1);
  }
  return sanitized;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending reminders that are due
    const now = new Date().toISOString();
    const { data: pendingReminders, error: remindersError } = await supabase
      .from('debt_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(50);

    if (remindersError) {
      throw new Error(`Failed to fetch reminders: ${remindersError.message}`);
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending reminders to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as { id: string; status: string; reason?: string }[]
    };

    for (const reminder of pendingReminders as DebtReminder[]) {
      results.processed++;

      // Fetch the debt
      const { data: debt, error: debtError } = await supabase
        .from('debts')
        .select('*')
        .eq('id', reminder.debt_id)
        .single();

      if (debtError || !debt) {
        // Debt was deleted, skip reminder
        await supabase
          .from('debt_reminders')
          .update({ status: 'skipped', skip_reason: 'Debt not found' })
          .eq('id', reminder.id);
        
        results.skipped++;
        results.details.push({ id: reminder.id, status: 'skipped', reason: 'Debt not found' });
        continue;
      }

      const typedDebt = debt as Debt;
      const balance = typedDebt.total_amount - typedDebt.paid_amount;

      // Skip if balance is zero
      if (balance <= 0) {
        await supabase
          .from('debt_reminders')
          .update({ status: 'skipped', skip_reason: 'Debt fully paid' })
          .eq('id', reminder.id);
        
        results.skipped++;
        results.details.push({ id: reminder.id, status: 'skipped', reason: 'Debt fully paid' });
        continue;
      }

      // Skip if no valid phone number
      if (!typedDebt.customer_phone || typedDebt.customer_phone.replace(/[^\d]/g, '').length < 10) {
        await supabase
          .from('debt_reminders')
          .update({ status: 'skipped', skip_reason: 'Invalid phone number' })
          .eq('id', reminder.id);
        
        results.skipped++;
        results.details.push({ id: reminder.id, status: 'skipped', reason: 'Invalid phone number' });
        continue;
      }

      // Get user profile for business name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', typedDebt.user_id)
        .single();

      const businessName = (profile as Profile | null)?.display_name || 'My Business';

      // Calculate days outstanding
      const debtDate = new Date(typedDebt.date);
      const nowDate = new Date();
      const daysOutstanding = Math.floor((nowDate.getTime() - debtDate.getTime()) / (1000 * 60 * 60 * 24));

      // Generate WhatsApp URL
      const message = generateReminderMessage(
        typedDebt.customer_name,
        typedDebt.total_amount,
        typedDebt.paid_amount,
        balance,
        businessName,
        '₦', // Default currency symbol for Nigeria
        daysOutstanding
      );

      const sanitizedPhone = sanitizePhoneNumber(typedDebt.customer_phone);
      const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;

      // Mark as sent (the actual sending is manual via the URL)
      // In a real implementation, you might integrate with WhatsApp Business API
      await supabase
        .from('debt_reminders')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString() 
        })
        .eq('id', reminder.id);

      // Log the reminder in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: typedDebt.user_id,
          user_email: 'system@auto-reminder',
          user_role: 'admin',
          action: 'auto_reminder',
          table_name: 'debt_reminders',
          record_id: reminder.id,
          description: `Auto reminder (Day ${reminder.reminder_day}) scheduled for ${typedDebt.customer_name}`,
          new_data: { 
            reminder_day: reminder.reminder_day,
            debt_id: typedDebt.id,
            customer_name: typedDebt.customer_name,
            balance,
            whatsapp_url: whatsappUrl
          },
          mode: 'online'
        });

      results.sent++;
      results.details.push({ 
        id: reminder.id, 
        status: 'sent', 
        reason: `Day ${reminder.reminder_day} reminder ready` 
      });
    }

    return new Response(
      JSON.stringify({ 
        message: 'Reminders processed successfully', 
        ...results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
