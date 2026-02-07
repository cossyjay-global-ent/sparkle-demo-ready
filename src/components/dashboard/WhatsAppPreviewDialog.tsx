import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageCircle, Phone, AlertTriangle } from 'lucide-react';
import { generateDebtMessage, DebtMessageData, getDaysSinceDate, isDebtOverdue } from '@/lib/whatsapp';
import { Badge } from '@/components/ui/badge';

interface WhatsAppPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  messageData: DebtMessageData | null;
  debtDate?: string | number;
}

export function WhatsAppPreviewDialog({
  open,
  onOpenChange,
  onConfirm,
  messageData,
  debtDate
}: WhatsAppPreviewDialogProps) {
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<string>('');

  useEffect(() => {
    if (messageData) {
      const message = generateDebtMessage(messageData, debtDate);
      setPreviewMessage(message);
      
      // Determine message type for display
      const balance = Number(messageData.balance) || 0;
      const paidAmount = Number(messageData.paidAmount) || 0;
      
      if (balance <= 0) {
        setMessageType('Thank You (Fully Paid)');
      } else if (debtDate && isDebtOverdue(debtDate)) {
        setMessageType('Overdue Reminder');
      } else if (paidAmount > 0) {
        setMessageType('Partial Payment Reminder');
      } else {
        setMessageType('Outstanding Debt Reminder');
      }
    }
  }, [messageData, debtDate]);

  if (!messageData) return null;

  const balance = Number(messageData.balance) || 0;
  const isOverdue = debtDate ? isDebtOverdue(debtDate) : false;
  const daysOutstanding = debtDate ? getDaysSinceDate(debtDate) : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Preview WhatsApp Message
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {/* Message Type Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={balance <= 0 ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                {messageType}
              </Badge>
              {isOverdue && (
                <Badge variant="outline" className="text-warning border-warning">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {daysOutstanding} days outstanding
                </Badge>
              )}
            </div>

            {/* Customer Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-foreground">{messageData.customerName}</p>
              <p className="text-sm flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {messageData.customerPhone}
              </p>
            </div>

            {/* Message Preview */}
            <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">Message Preview:</p>
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                {previewMessage}
              </pre>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Open WhatsApp
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
