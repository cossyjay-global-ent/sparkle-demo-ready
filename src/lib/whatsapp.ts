/**
 * WhatsApp Reminder Utility for Debts Module
 * Generates pre-filled WhatsApp messages for debt reminders
 */

export interface DebtMessageData {
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  businessName: string;
  currencySymbol: string;
}

/**
 * Sanitize phone number for WhatsApp URL
 * Removes spaces, dashes, and ensures proper format
 */
export const sanitizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except leading +
  let sanitized = phone.replace(/[^\d+]/g, '');
  
  // If starts with 0, replace with country code (assume Nigeria +234)
  if (sanitized.startsWith('0')) {
    sanitized = '234' + sanitized.slice(1);
  }
  
  // Remove leading + if present (wa.me doesn't need it)
  if (sanitized.startsWith('+')) {
    sanitized = sanitized.slice(1);
  }
  
  return sanitized;
};

/**
 * Format currency amount for message
 */
const formatAmount = (amount: number, symbol: string): string => {
  return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Generate message based on debt payment status
 * Logic:
 * - Case 1: Outstanding Debt (balance > 0 AND paidAmount === 0) - No payment made yet
 * - Case 2: Partial Payment (balance > 0 AND paidAmount > 0) - Some payment made
 * - Case 3: Fully Paid (balance <= 0) - Debt fully settled
 */
export const generateDebtMessage = (data: DebtMessageData): string => {
  const { customerName, totalAmount, paidAmount, balance, businessName, currencySymbol } = data;
  
  // Ensure numeric values are properly cast
  const numericBalance = Number(balance) || 0;
  const numericPaidAmount = Number(paidAmount) || 0;
  const numericTotalAmount = Number(totalAmount) || 0;
  
  // Case 3: Fully Paid (balance <= 0) - Check this FIRST
  if (numericBalance <= 0) {
    return `Hello ${customerName},

We confirm that your payment has been fully received.

Thank you for completing your final payment and for doing business with us.

We truly appreciate your trust and cooperation.

Please feel free to contact us if you need any further assistance.

Warm regards,
${businessName}`;
  }
  
  // Case 2: Partial Payment Made (balance > 0 AND paidAmount > 0)
  if (numericBalance > 0 && numericPaidAmount > 0) {
    return `Hello ${customerName},

Thank you for your partial payment.

Payment Summary:
Total Amount: ${formatAmount(numericTotalAmount, currencySymbol)}
Amount Paid: ${formatAmount(numericPaidAmount, currencySymbol)}
Outstanding Balance: ${formatAmount(numericBalance, currencySymbol)}

We kindly request that the remaining balance be settled at your convenience.

Please let us know when the final payment will be completed.

Thank you for your continued cooperation.

Best regards,
${businessName}`;
  }
  
  // Case 1: Outstanding Debt (balance > 0 AND paidAmount === 0) - No payment made
  return `Hello ${customerName},

This is a polite reminder regarding your outstanding payment with us.

Total Amount: ${formatAmount(numericTotalAmount, currencySymbol)}
Outstanding Balance: ${formatAmount(numericBalance, currencySymbol)}

We kindly request that payment be made at your earliest convenience.

Please let us know if you have any questions or need clarification.

Best regards,
${businessName}`;
};

/**
 * Generate WhatsApp URL with pre-filled message
 */
export const generateWhatsAppUrl = (phone: string, message: string): string => {
  const sanitizedPhone = sanitizePhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
};

/**
 * Open WhatsApp with pre-filled debt reminder message
 */
export const openWhatsAppReminder = (data: DebtMessageData): boolean => {
  if (!data.customerPhone) {
    return false;
  }
  
  const message = generateDebtMessage(data);
  const url = generateWhatsAppUrl(data.customerPhone, message);
  
  // Open in new tab
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
