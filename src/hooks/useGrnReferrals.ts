import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsGrnInputOnly } from '@/hooks/useGrnInputRole';

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
  const inputOnly = useIsGrnInputOnly();
  const admin = typeof isAdmin === 'function' ? isAdmin() : false;
  if (admin || hasPermission('Finance:process') || hasPermission('Finance:approve')) return true;
  // Legacy module-level finance access ("Finance" / "Finance Management") still
  // releases payments — only the scan-only GRN input role is restricted.
  return !inputOnly && (hasPermission('Finance') || hasPermission('Finance Management'));
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

/**
 * Batch digest: we do NOT email on every single referral (that flooded inboxes).
 * An in-app notification is always created, but the email/SMS digest only goes
 * out once the assignee's pending queue hits a multiple of BATCH_SIZE — one
 * email listing all GRNs ready for payment.
 */
const BATCH_SIZE = 10;

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

  // In-app notification (resolve the assignee's employee record) — always
  const { data: emp } = await supabase
    .from('employees')
    .select('id, name, department')
    .ilike('email', p.assignedEmail)
    .maybeSingle();

  if (emp?.id) {
    await supabase.from('notifications').insert({
      type: 'approval_request',
      title: 'GRN forwarded to you for payment',
      message: `${p.referrerName} forwarded GRN ${p.batchNumber} (${money}) to you for payment.`,
      priority: 'high',
      target_user_id: (emp as any).id,
      target_department: (emp as any).department || 'Finance',
      is_read: false,
      metadata: { source: 'grn_referral', allocation_id: p.allocationId, batch_number: p.batchNumber },
    } as any);
  }

  // Pending queue for this assignee
  const { data: pending } = await supabase
    .from('grn_payment_allocations')
    .select('batch_number, supplier_name, coffee_type, quantity_kg, amount_ugx, referred_by_name, referred_by_email')
    .ilike('assigned_to_email', p.assignedEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(200);

  const rows = (pending || []) as any[];
  const count = rows.length;
  if (count < BATCH_SIZE || count % BATCH_SIZE !== 0) return; // wait for the next full batch

  const total = rows.reduce((s, r) => s + Number(r.amount_ugx || 0), 0);
  const title = `${count} GRNs ready for payment`;
  const table = [
    'Batch | Supplier | Coffee | KG | Amount (UGX) | Input by',
    ...rows.map((r) =>
      [
        r.batch_number,
        r.supplier_name || '-',
        r.coffee_type || '-',
        r.quantity_kg ? Number(r.quantity_kg).toLocaleString() : '-',
        Number(r.amount_ugx || 0).toLocaleString(),
        r.referred_by_name || r.referred_by_email || '-',
      ].join(' | ')
    ),
  ].join('\n');

  const message = [
    `You have ${count} GRNs awaiting payment release, totalling UGX ${total.toLocaleString()}.`,
    '',
    table,
    '',
    'Open Finance > Referrals to review, pay and print the payment receipts.',
  ].join('\n');

  await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'general-notification',
      recipientEmail: p.assignedEmail,
      // one digest per batch milestone (10, 20, 30 ...) per day
      idempotencyKey: `grn-referral-digest-${p.assignedEmail}-${count}-${new Date().toISOString().slice(0, 10)}`,
      templateData: {
        subject: `${count} GRNs ready for payment — UGX ${total.toLocaleString()}`,
        title,
        recipientName: emp?.name || p.assignedName,
        message,
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

  const allReferrals = query.data || [];

  // Paid referrals should disappear from the active referrals list, but we keep
  // the full dataset for receipts/history lookups and reward calculations.
  const referrals = allReferrals.filter((r) => r.status !== 'paid');
  const paidReferrals = allReferrals.filter((r) => r.status === 'paid');

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

  const pending = referrals.filter((r) => r.status === 'pending');
  const assignedToMe = pending.filter((r) => r.assigned_to_email.toLowerCase() === myEmail);
  const referredByMe = referrals.filter((r) => r.referred_by_email.toLowerCase() === myEmail);
  const allReferredByMe = allReferrals.filter((r) => r.referred_by_email.toLowerCase() === myEmail);
  const referralRewards = allReferredByMe.reduce((s, r) => s + Number(r.referrer_reward_ugx || 0), 0);

  return {
    referrals,
    allReferrals,
    paidReferrals,
    myEmail,
    pending,
    assignedToMe,
    referredByMe,
    referralRewards,
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
