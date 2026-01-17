/**
 * CLOUD-SYNC-CRITICAL: Real-time subscription hook for Supabase
 * This hook provides automatic real-time synchronization across all devices
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'sales' | 'expenses' | 'products' | 'customers' | 'debts' | 'debt_payments' | 'audit_logs';

interface UseRealtimeSubscriptionOptions<T> {
  table: TableName;
  userId: string | undefined;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { id: string }) => void;
  onAnyChange?: () => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time changes on a Supabase table
 * Automatically filters by user_id and handles cleanup
 */
export function useRealtimeSubscription<T extends { id: string; user_id?: string }>({
  table,
  userId,
  onInsert,
  onUpdate,
  onDelete,
  onAnyChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  const subscribe = useCallback(() => {
    // CLOUD-SYNC-CRITICAL: Don't subscribe if no user or disabled
    if (!userId || !enabled) {
      return;
    }

    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      return;
    }

    const channelName = `${table}_changes_${userId}`;
    
    console.log(`[Realtime] Subscribing to ${table} for user ${userId}`);

    // CLOUD-SYNC-CRITICAL: Create channel with user-scoped filter
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`[Realtime] INSERT on ${table}:`, payload.new);
          if (onInsert && payload.new) {
            onInsert(payload.new as T);
          }
          onAnyChange?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`[Realtime] UPDATE on ${table}:`, payload.new);
          if (onUpdate && payload.new) {
            onUpdate(payload.new as T);
          }
          onAnyChange?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table,
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`[Realtime] DELETE on ${table}:`, payload.old);
          if (onDelete && payload.old) {
            onDelete({ id: (payload.old as T).id });
          }
          onAnyChange?.();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Channel ${channelName} status:`, status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        }
      });

    channelRef.current = channel;
  }, [table, userId, enabled, onInsert, onUpdate, onDelete, onAnyChange]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  }, [table]);

  useEffect(() => {
    subscribe();

    // CLOUD-SYNC-CRITICAL: Clean up on unmount to prevent memory leaks
    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  // CLOUD-SYNC-CRITICAL: Resubscribe on reconnect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log(`[Realtime] App became visible, resubscribing to ${table}`);
        unsubscribe();
        subscribe();
      }
    };

    const handleOnline = () => {
      console.log(`[Realtime] Network online, resubscribing to ${table}`);
      unsubscribe();
      subscribe();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [table, subscribe, unsubscribe]);

  return { unsubscribe, resubscribe: subscribe };
}

/**
 * Hook for subscribing to multiple tables at once
 */
export function useMultiTableRealtimeSubscription({
  tables,
  userId,
  onAnyChange,
  enabled = true,
}: {
  tables: TableName[];
  userId: string | undefined;
  onAnyChange: () => void;
  enabled?: boolean;
}) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!userId || !enabled) return;

    console.log(`[Realtime] Setting up multi-table subscription for tables:`, tables);

    const channels: RealtimeChannel[] = [];

    tables.forEach((table) => {
      const channelName = `multi_${table}_${userId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log(`[Realtime] Change on ${table}:`, payload.eventType);
            onAnyChange();
          }
        )
        .subscribe();

      channels.push(channel);
    });

    channelsRef.current = channels;

    return () => {
      console.log(`[Realtime] Cleaning up multi-table subscriptions`);
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [tables.join(','), userId, enabled, onAnyChange]);
}
