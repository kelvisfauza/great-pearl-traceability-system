import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const RECEIVERS = ['tumwinealex@greatpearlcoffee.com', 'nuwagabagadaffi@greatpearlcoffee.com'];
const CREATORS = ['kamugishabwambale@gmail.com', 'kahindodaphne@greatpearlcoffee.com'];

export default function SamplingOrderAlert() {
  const { employee } = useAuth();
  const email = (employee?.email || '').toLowerCase();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!RECEIVERS.includes(email)) return;
    const ch = supabase
      .channel(`sampling-alert-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quality_sampling_orders' }, (payload) => {
        const o: any = payload.new;
        if (!CREATORS.includes((o?.created_by_email || '').toLowerCase())) return;
        setOrders((prev) => [...prev, o]);
        try { new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play().catch(() => {}); } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [email]);

  const current = orders[0];
  if (!current) return null;
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New sampling order {current.order_number}</AlertDialogTitle>
          <AlertDialogDescription>
            {current.created_by_name || current.created_by_email} created a sampling order for{' '}
            <strong>{current.supplier_name}</strong>
            {current.delivery_time ? ` · ${new Date(current.delivery_time).toLocaleString()}` : ''}. Please collect the sample from Store.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setOrders((p) => p.slice(1))}>
            OK{orders.length > 1 ? ` (${orders.length - 1} more)` : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
