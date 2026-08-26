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
      const { data, error } = await (supabase as any).rpc('get_finance_payment_assignees');
      if (error) throw error;
      return (data || [])
        .filter((e: any) => e?.name && e?.email)
        .map((e: any) => ({
          name: e.name,
          email: String(e.email).toLowerCase(),
          position: e.job_title || e.position || null,
          department: e.department || null,
        }));
    },
  });

/** Sends an in-app notification + branded email to the finance approver a GRN was forwarded to. */
const notifyReferralAssignee = async (p: {
  allocationId: string;
  assignedEmail: string;
  assignedName: string;
  referrerName: string;
  batchNumber: string;
  supplierName: string | null;
  coffeeType: string | null;
  quantityKg: number | null;
  amountUgx: number;
  notes: string | null;
}) => {
  const money = `UGX ${Number(p.amountUgx || 0).toLocaleString()}`;
  const title = 'GRN forwarded to you for payment';
  const lines = [
    `${p.referrerName} has scanned and forwarded a GRN to you for payment release.`,
    '',
    `Batch: ${p.batchNumber}`,
    p.supplierName ? `Supplier: ${p.supplierName}` : '',
    p.coffeeType ? `Coffee type: ${p.coffeeType}` : '',
    p.quantityKg ? `Quantity: ${Number(p.quantityKg).toLocaleString()} kg` : '',
    `Amount: ${money}`,
    p.notes ? `Notes: ${p.notes}` : '',
    '',
    'Open Finance > Referrals to review, pay and print the payment receipt.',
  ].filter(Boolean);

  // In-app notification (resolve the assignee's employee record)
  const { data: emp } = await supabase
    .from('employees')
    .select('id, name, department')
    .ilike('email', p.assignedEmail)
    .maybeSingle();

  if (emp?.id) {
    await supabase.from('notifications').insert({
      type: 'approval_request',
      title,
      message: `${p.referrerName} forwarded GRN ${p.batchNumber} (${money}) to you for payment.`,
      priority: 'high',
      target_user_id: (emp as any).id,
      target_department: (emp as any).department || 'Finance',
      is_read: false,
      metadata: { source: 'grn_referral', allocation_id: p.allocationId, batch_number: p.batchNumber },
    } as any);
  }

  await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'general-notification',
      recipientEmail: p.assignedEmail,
      idempotencyKey: `grn-referral-${p.allocationId}`,
      templateData: {
        subject: `GRN ${p.batchNumber} forwarded for payment — ${money}`,
        title,
        recipientName: emp?.name || p.assignedName,
        message: lines.join('\n'),
      },
    },
  });
};


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
      const assignedEmail = input.assigned_to_email.toLowerCase();
      const { data: inserted, error } = await supabase
        .from('grn_payment_allocations')
        .insert({
          batch_number: input.batch_number,
          lot_id: input.lot_id || null,
          pay_code: input.pay_code || null,
          supplier_name: input.supplier_name || null,
          coffee_type: input.coffee_type || null,
          quantity_kg: input.quantity_kg ?? null,
          amount_ugx: input.amount_ugx || 0,
          referred_by_email: myEmail,
          referred_by_name: employee?.name || myEmail,
          assigned_to_email: assignedEmail,
          assigned_to_name: input.assigned_to_name || null,
          notes: input.notes || null,
          status: 'pending',
        } as any)
        .select('id')
        .maybeSingle();
      if (error) throw error;

      // Notify the assignee: in-app notification + branded email
      try {
        await notifyReferralAssignee({
          allocationId: (inserted as any)?.id || input.batch_number,
          assignedEmail,
          assignedName: input.assigned_to_name || assignedEmail.split('@')[0],
          referrerName: employee?.name || myEmail,
          batchNumber: input.batch_number,
          supplierName: input.supplier_name || null,
          coffeeType: input.coffee_type || null,
          quantityKg: input.quantity_kg ?? null,
          amountUgx: input.amount_ugx || 0,
          notes: input.notes || null,
        });
      } catch (e) {
        console.error('Referral notification failed', e);
      }
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
