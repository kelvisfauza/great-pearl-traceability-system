import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Quotation {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  subject: string;
  amount: number | null;
  currency: string;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  status: string;
  submitted_by: string | null;
  submitted_by_email: string | null;
  procurement_decision: string | null;
  procurement_notes: string | null;
  procurement_by: string | null;
  procurement_at: string | null;
  approval_decision: string | null;
  approval_notes: string | null;
  approval_by: string | null;
  approval_at: string | null;
  reference?: string | null;
  finance_status?: string | null;
  finance_method?: string | null;
  finance_reference?: string | null;
  finance_paid_by?: string | null;
  finance_paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationMessage {
  id: string;
  quotation_id: string;
  channel: string;
  subject: string | null;
  body: string;
  recipient: string | null;
  status: string;
  error: string | null;
  sent_by: string | null;
  created_at: string;
}

export interface QuotationRevision {
  id: string;
  quotation_id: string;
  revision_number: number;
  previous_amount: number | null;
  amount: number | null;
  previous_file_path: string | null;
  previous_file_name: string | null;
  file_path: string | null;
  file_name: string | null;
  changes_summary: string | null;
  attached_by: string | null;
  created_at: string;
}

export const QUOTATION_STATUS_LABEL: Record<string, string> = {
  submitted: 'Awaiting procurement review',
  revision_requested: 'Revision requested',
  recommended: 'Awaiting management approval',
  rejected_procurement: 'Rejected by procurement',
  approved: 'Approved',
  rejected: 'Rejected by management',
};

export const useQuotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [messages, setMessages] = useState<Record<string, QuotationMessage[]>>({});
  const [revisions, setRevisions] = useState<Record<string, QuotationRevision[]>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuotations((data || []) as Quotation[]);

      const { data: msgs } = await (supabase as any)
        .from('quotation_messages')
        .select('*')
        .order('created_at', { ascending: false });
      const grouped: Record<string, QuotationMessage[]> = {};
      ((msgs || []) as QuotationMessage[]).forEach((m) => {
        (grouped[m.quotation_id] ||= []).push(m);
      });
      setMessages(grouped);

      const { data: revs } = await (supabase as any)
        .from('quotation_revisions')
        .select('*')
        .order('created_at', { ascending: true });
      const rg: Record<string, QuotationRevision[]> = {};
      ((revs || []) as QuotationRevision[]).forEach((r) => {
        (rg[r.quotation_id] ||= []).push(r);
      });
      setRevisions(rg);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Status text + email to the company at each stage (never blocks the action itself)
  const notifyStage = async (quotationId: string, stage: string) => {
    try {
      await supabase.functions.invoke('quotation-notify', { body: { quotationId, stage } });
    } catch (e) {
      console.warn('quotation stage message failed', e);
    }
  };

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('quotations').upload(path, file, { upsert: false });
    if (error) throw error;
    return { path, name: file.name };
  };

  const createQuotation = async (
    payload: Partial<Quotation>,
    file: File | null,
    submitter: { name?: string | null; email?: string | null },
  ) => {
    let file_path: string | null = null;
    let file_name: string | null = null;
    if (file) {
      const uploaded = await uploadFile(file);
      file_path = uploaded.path;
      file_name = uploaded.name;
    }
    const { data: created, error } = await (supabase as any).from('quotations').insert({
      ...payload,
      file_path,
      file_name,
      status: 'submitted',
      submitted_by: submitter.name || null,
      submitted_by_email: submitter.email || null,
    }).select('id').single();
    if (error) throw error;
    if (created?.id) await notifyStage(created.id, 'received');
    await refresh();
  };

  const recordProcurementDecision = async (
    id: string,
    decision: 'recommended' | 'revision_requested' | 'rejected_procurement',
    notes: string,
    reviewer: { name?: string | null; email?: string | null },
  ) => {
    const { error } = await (supabase as any)
      .from('quotations')
      .update({
        status: decision,
        procurement_decision: decision,
        procurement_notes: notes || null,
        procurement_by: reviewer.name || reviewer.email || null,
        procurement_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    if (decision === 'recommended') await notifyStage(id, 'procurement_approved');
    await refresh();
  };

  const recordApproval = async (
    id: string,
    decision: 'approved' | 'rejected',
    notes: string,
    approver: { name?: string | null; email?: string | null },
  ) => {
    const { error } = await (supabase as any)
      .from('quotations')
      .update({
        status: decision,
        approval_decision: decision,
        approval_notes: notes || null,
        approval_by: approver.name || approver.email || null,
        approval_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    if (decision === 'approved') await notifyStage(id, 'admin_approved');
    await refresh();
  };

  /** Finance marks an approved quotation as paid; the company gets the final message. */
  const markDisbursed = async (id: string, method: string, paymentReference?: string, payPhone?: string) => {
    const { data, error } = await supabase.functions.invoke('quotation-notify', {
      body: { quotationId: id, stage: 'disbursed', method, paymentReference, payPhone },
    });
    if (error) throw error;
    if ((data as any)?.ok === false) throw new Error((data as any).error || 'Could not mark as disbursed');
    await refresh();
  };

  const attachRevision = async (
    q: Quotation,
    opts: { file: File | null; amount: number | null; changes: string },
    by: { name?: string | null; email?: string | null },
  ) => {
    let file_path = q.file_path;
    let file_name = q.file_name;
    if (opts.file) {
      const up = await uploadFile(opts.file);
      file_path = up.path;
      file_name = up.name;
    }
    const prev = revisions[q.id] || [];
    const { error: rErr } = await (supabase as any).from('quotation_revisions').insert({
      quotation_id: q.id,
      revision_number: prev.length + 1,
      previous_amount: q.amount,
      amount: opts.amount,
      previous_file_path: q.file_path,
      previous_file_name: q.file_name,
      file_path,
      file_name,
      changes_summary: opts.changes || null,
      attached_by: by.name || by.email || null,
      attached_by_email: by.email || null,
    });
    if (rErr) throw rErr;
    const { error } = await (supabase as any).from('quotations').update({
      amount: opts.amount,
      file_path,
      file_name,
      status: 'submitted',
    }).eq('id', q.id);
    if (error) throw error;
    await refresh();
  };

  const notifyCompany = async (opts: {
    quotationId: string;
    subject: string;
    message: string;
    sendEmail: boolean;
    sendSms: boolean;
  }) => {
    const { data, error } = await supabase.functions.invoke('quotation-notify', { body: opts });
    if (error) throw error;
    if (data && data.ok === false) throw new Error(data.error || 'The reply could not be sent');
    await refresh();
    return data as { ok: boolean; emailSent: boolean; smsSent: boolean };
  };

  return {
    quotations,
    messages,
    revisions,
    loading,
    refresh,
    createQuotation,
    recordProcurementDecision,
    recordApproval,
    markDisbursed,
    notifyCompany,
    attachRevision,
  };
};
