import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Receipt } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentRecord {
  id: string;
  plan: string;
  amount: number;
  status: string;
  reference: string;
  created_at: string;
  currency: string;
}

function formatAmount(value: unknown, currency: string): string {
  const num = Number(value) || 0;
  const display = currency === 'NGN' ? num / 100 : num;
  return `₦${display.toLocaleString()}`;
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '-';
  try {
    return format(new Date(value), 'MMM d, yyyy · h:mm a');
  } catch {
    return '-';
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'success':
      return 'default' as const;
    case 'pending':
      return 'secondary' as const;
    case 'failed':
      return 'destructive' as const;
    case 'cancelled':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'failed':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'cancelled':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return '';
  }
}

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchRecords() {
      try {
        const { data, error } = await supabase
          .from('payment_records')
          .select('id, plan, amount, status, reference, created_at, currency')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[Billing] Failed to load payment records:', err);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecords();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing History</h1>
            <p className="text-sm text-muted-foreground">View your payment records</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5" />
              Payment Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No payment history yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id ?? record.reference}>
                        <TableCell className="font-medium capitalize">
                          {record.plan || '-'}
                        </TableCell>
                        <TableCell>
                          {formatAmount(record.amount, record.currency || 'NGN')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status || '')}>
                            {record.status || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                          {record.reference || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(record.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
