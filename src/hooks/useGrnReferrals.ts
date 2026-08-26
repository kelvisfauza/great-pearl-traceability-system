import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GrnReferral {
  id: string;
  batch_number: string;
  lot_id: string | null;
  pay_code: string | null;
  supplier_name: string | null;
  coffee_type: string | null;
  quantity_kg: number | null;
  amount_ugx: number;
  referred_by_email: string;
  referred_by_name: string | null;
  assigned_to_email: string;
  assigned_to_name: string | null;
  status: string;
  notes: string | null;
  paid_by_email: string | null;
  paid_at: string | null;
  referrer_reward_ugx: number;
  payer_reward_ugx: number;
  created_at: string;
}

export interface FinancePayer {
  name: string;
  email: string;
  position: string | null;
  department: string | null;
}

/**
 * Who can actually release a supplier payment and print the payment receipt.
 * Scan-only finance staff (e.g. the Procurement/IT officer) hold Finance:view +
 * Finance:create only — they submit the scanned GRN to one of these people.
 */
export const useCanReleasePayments = () => {
  const { hasPermission, isAdmin } = useAuth();
  const admin = typeof isAdmin === 'function' ? isAdmin() : false;
  return admin || hasPermission('Finance:process') || hasPermission('Finance:approve');
};

/** Finance approvers a scanned GRN can be allocated to. */
export const useFinancePayers = () =>
  useQuery({
    queryKey: ['finance-payers'],
    queryFn: async (): Promise<FinancePayer[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('name, email, position, department, role, permissions, disabled')
        .order('name');
      if (error) throw error;
      return (data || [])
        .filter((e: any) => !e.disabled)
        .filter((e: any) => {
          const perms: string[] = e.permissions || [];
          return (
            perms.includes('*') ||
            perms.includes('Finance:process') ||
            perms.includes('Finance:approve')
          );
        })
        .map((e: any) => ({
          name: e.name,
          email: e.email,
          position: e.position || e.role || null,
          department: e.department || null,
        }));
    },
  });

export const useGrnReferrals = () => {
  const { user, employee } = useAuth();
  const myEmail = (employee?.email || user?.email || '').toLowerCase();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['grn-referrals'],
    queryFn: async (): Promise<GrnReferral[]> => {
      const { data, error } = await supabase
        .from('grn_payment_allocations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as GrnReferral[];
    },
  });

  const referrals = query.data || [];

  const create = useMutation({
    mutationFn: async (input: {
      batch_number: string;
      lot_id?: string | null;
      pay_code?: string | null;
      supplier_name?: string | null;
      coffee_type?: string | null;
      quantity_kg?: number | null;
      amount_ugx: number;
      assigned_to_email: string;
      assigned_to_name?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from('grn_payment_allocations').insert({
        batch_number: input.batch_number,
        lot_id: input.lot_id || null,
        pay_code: input.pay_code || null,
        supplier_name: input.supplier_name || null,
        coffee_type: input.coffee_type || null,
        quantity_kg: input.quantity_kg ?? null,
        amount_ugx: input.amount_ugx || 0,
        referred_by_email: myEmail,
        referred_by_name: employee?.name || myEmail,
        assigned_to_email: input.assigned_to_email.toLowerCase(),
        assigned_to_name: input.assigned_to_name || null,
        notes: input.notes || null,
        status: 'pending',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grn-referrals'] }),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grn_payment_allocations')
        .update({ status: 'cancelled' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grn-referrals'] }),
  });

  return {
    referrals,
    myEmail,
    pending: referrals.filter((r) => r.status === 'pending'),
    assignedToMe: referrals.filter(
      (r) => r.status === 'pending' && r.assigned_to_email.toLowerCase() === myEmail
    ),
    referredByMe: referrals.filter((r) => r.referred_by_email.toLowerCase() === myEmail),
    loading: query.isLoading,
    refetch: query.refetch,
    createReferral: create.mutateAsync,
    creating: create.isPending,
    cancelReferral: cancel.mutateAsync,
  };
};

/** Marks the referral paid and rewards both the scanner and the payer. */
export const completeGrnReferral = async (batch: string, lotId?: string | null) => {
  const { data, error } = await supabase.rpc('complete_grn_referral' as any, {
    p_batch: batch,
    p_lot_id: lotId || null,
  });
  if (error) return null;
  return data as any;
};
