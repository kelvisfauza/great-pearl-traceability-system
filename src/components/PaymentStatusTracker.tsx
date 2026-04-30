import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type PayStatus = 'pending' | 'success' | 'failed';

interface PaymentItem {
  id: string;
  source: 'mm' | 'ussd';
  reference: string;
  amount: number;
  phone: string | null;
  status: PayStatus;
  type: string; // deposit / withdrawal / ussd
  createdAt: string;
  updatedAt?: string;
}

const statusMeta: Record<PayStatus, { label: string; cls: string; icon: React.ElementType }> = {
  pending: {
    label: 'Pending',
    cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    icon: Loader2,
  },
  success: {
    label: 'Successful',
    cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    cls: 'bg-red-500/10 text-red-600 border-red-500/30',
    icon: XCircle,
  },
};

const normalizeStatus = (s?: string | null): PayStatus => {
  const v = (s || '').toLowerCase();
  if (['success', 'successful', 'completed', 'paid', 'credited'].includes(v)) return 'success';
  if (['failed', 'failure', 'rejected', 'cancelled', 'canceled', 'expired'].includes(v)) return 'failed';
  return 'pending';
};

const phoneVariants = (raw?: string): string[] => {
  if (!raw) return [];
  const digits = raw.replace(/\D/g, '');
  const variants = new Set<string>();
  variants.add(digits);
  if (digits.startsWith('256')) {
    variants.add('0' + digits.slice(3));
    variants.add('+' + digits);
  } else if (digits.startsWith('0')) {
    variants.add('256' + digits.slice(1));
    variants.add('+256' + digits.slice(1));
  }
  return Array.from(variants).filter(Boolean);
};

const PaymentStatusTracker: React.FC = () => {
  const { user, employee } = useAuth();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const phones = useMemo(() => phoneVariants(employee?.phone), [employee?.phone]);

  const merge = useCallback((incoming: PaymentItem) => {
    setItems((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (i) => i.source === incoming.source && i.id === incoming.id,
      );
      if (idx >= 0) next[idx] = { ...next[idx], ...incoming };
      else next.unshift(incoming);
      // Sort by createdAt desc & cap at 15
      return next
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 15);
    });
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sinceISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const mmQ = supabase
        .from('mobile_money_transactions')
        .select('id, transaction_ref, phone, amount, status, transaction_type, created_at, updated_at')
        .eq('user_id', user.id)
        .gte('created_at', sinceISO)
        .order('created_at', { ascending: false })
        .limit(15);

      const ussdQ = phones.length
        ? supabase
            .from('ussd_payment_logs')
            .select('id, reference, phone, amount, status, created_at')
            .in('phone', phones)
            .gte('created_at', sinceISO)
            .order('created_at', { ascending: false })
            .limit(15)
        : Promise.resolve({ data: [], error: null } as any);

      const [mmRes, ussdRes] = await Promise.all([mmQ, ussdQ as any]);

      const merged: PaymentItem[] = [];

      (mmRes.data || []).forEach((r: any) => {
        merged.push({
          id: r.id,
          source: 'mm',
          reference: r.transaction_ref,
          amount: Number(r.amount) || 0,
          phone: r.phone,
          status: normalizeStatus(r.status),
          type: r.transaction_type || 'deposit',
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        });
      });

      (ussdRes.data || []).forEach((r: any) => {
        // Skip if there's already an MM record with same reference
        if (merged.some((m) => m.reference === r.reference)) return;
        merged.push({
          id: r.id,
          source: 'ussd',
          reference: r.reference,
          amount: Number(r.amount) || 0,
          phone: r.phone,
          status: normalizeStatus(r.status),
          type: 'ussd',
          createdAt: r.created_at,
        });
      });

      merged.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setItems(merged.slice(0, 15));
    } finally {
      setLoading(false);
    }
  }, [user, phones]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`payment-tracker-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_money_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const r: any = payload.new || payload.old;
          if (!r) return;
          merge({
            id: r.id,
            source: 'mm',
            reference: r.transaction_ref,
            amount: Number(r.amount) || 0,
            phone: r.phone,
            status: normalizeStatus(r.status),
            type: r.transaction_type || 'deposit',
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ussd_payment_logs' },
        (payload) => {
          const r: any = payload.new || payload.old;
          if (!r || !phones.includes(r.phone)) return;
          merge({
            id: r.id,
            source: 'ussd',
            reference: r.reference,
            amount: Number(r.amount) || 0,
            phone: r.phone,
            status: normalizeStatus(r.status),
            type: 'ussd',
            createdAt: r.created_at,
          });
        },
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, phones, merge]);

  // Auto-refresh pending items every 15s as a safety net
  useEffect(() => {
    const hasPending = items.some((i) => i.status === 'pending');
    if (!hasPending) return;
    const t = setInterval(fetchAll, 15000);
    return () => clearInterval(t);
  }, [items, fetchAll]);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, i) => {
        acc[i.status] += 1;
        return acc;
      },
      { pending: 0, success: 0, failed: 0 } as Record<PayStatus, number>,
    );
  }, [items]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Payment Status
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                live
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border',
              )}
              title={live ? 'Real-time connected' : 'Connecting...'}
            >
              <Radio className={cn('h-2.5 w-2.5', live && 'animate-pulse')} />
              {live ? 'Live' : 'Offline'}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Clock className="h-2.5 w-2.5 mr-1" />
              {counts.pending}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              {counts.success}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30">
              <XCircle className="h-2.5 w-2.5 mr-1" />
              {counts.failed}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={fetchAll}
              disabled={loading}
              aria-label="Refresh payments"
            >
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && items.length === 0 ? (
          <div className="py-8 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading payments...
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Smartphone className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No recent USSD or mobile money activity.
            <div className="text-[10px] mt-1 opacity-70">Pending and completed deposits will appear here in real-time.</div>
          </div>
        ) : (
          <ScrollArea className="h-[260px] pr-2">
            <ul className="space-y-1.5">
              {items.map((item) => {
                const meta = statusMeta[item.status];
                const Icon = meta.icon;
                return (
                  <li
                    key={`${item.source}-${item.id}`}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                      item.status === 'pending' && 'border-amber-500/30 bg-amber-500/[0.03]',
                      item.status === 'success' && 'border-emerald-500/20 bg-emerald-500/[0.02]',
                      item.status === 'failed' && 'border-red-500/20 bg-red-500/[0.02]',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'h-7 w-7 rounded-md flex items-center justify-center shrink-0 border',
                          meta.cls,
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-3.5 w-3.5',
                            item.status === 'pending' && 'animate-spin',
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold capitalize truncate">
                            {item.type === 'ussd' ? 'USSD Deposit' : item.type}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] px-1 py-0 h-4', meta.cls)}
                          >
                            {meta.label}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate font-mono">
                          {item.reference}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold tabular-nums">
                        UGX {item.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentStatusTracker;