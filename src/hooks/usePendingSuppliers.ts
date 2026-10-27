import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { validatePendingSupplier, type PendingSupplierInput } from '@/lib/pendingSupplierRules';

export function usePendingSuppliers() {
  const qc = useQueryClient();
  const { user, employee } = useAuth();

  const requests = useQuery({
    queryKey: ['pending-supplier-requests'],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pending_supplier_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const propose = useMutation({
    mutationFn: async (input: PendingSupplierInput) => {
      const check = validatePendingSupplier(input);
      if (!check.ok) throw new Error(check.error);
      const { error } = await (supabase as any).from('pending_supplier_requests').insert({
        proposed_name: check.value.name,
        origin: check.value.origin,
        phone: check.value.phone || null,
        opening_balance: check.value.openingBalance || 0,
        coffee_record_id: check.value.coffeeRecordId || null,
        delivery_label: check.value.deliveryLabel || null,
        proposed_by: user?.email || 'unknown',
        proposed_by_name: employee?.name || user?.email || 'Unknown',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-supplier-requests'] }),
  });

  const confirm = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await (supabase as any).rpc('confirm_pending_supplier', { p_request_id: requestId });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Confirmation failed');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-supplier-requests'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const decline = useMutation({
    mutationFn: async ({ requestId, realSupplierId }: { requestId: string; realSupplierId: string }) => {
      if (!realSupplierId) throw new Error('Choose the real supplier for this coffee');
      const { data, error } = await (supabase as any).rpc('decline_pending_supplier', { p_request_id: requestId, p_real_supplier_id: realSupplierId });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Decline failed');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-supplier-requests'] }),
  });

  return { requests, propose, confirm, decline };
}
