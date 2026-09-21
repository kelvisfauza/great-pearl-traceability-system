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
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

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
    const { error } = await (supabase as any).from('quotations').insert({
      ...payload,
      file_path,
      file_name,
      status: 'submitted',
      submitted_by: submitter.name || null,
      submitted_by_email: submitter.email || null,
    });
    if (error) throw error;
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
    loading,
    refresh,
    createQuotation,
    recordProcurementDecision,
    recordApproval,
    notifyCompany,
  };
};
