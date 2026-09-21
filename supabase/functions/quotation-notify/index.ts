import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalizePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  let p = String(raw).replace(/[^\d+]/g, '').trim();
  if (!p) return null;
  if (p.startsWith('+256')) p = '0' + p.slice(4);
  else if (p.startsWith('256')) p = '0' + p.slice(3);
  else if (p.startsWith('+')) return null;
  else if (p.length === 9 && p.startsWith('7')) p = '0' + p;
  if (!/^0\d{9}$/.test(p)) return null;
  return p;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ ok: false, error: 'Authentication required' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user?.email) return json({ ok: false, error: 'Invalid session' }, 401);

    const { data: sender } = await admin
      .from('employees')
      .select('name, email, role, department, permissions, status, disabled')
      .ilike('email', user.email)
      .maybeSingle();

    const role = (sender?.role || '').toLowerCase();
    const dept = (sender?.department || '').toLowerCase();
    const perms: string[] = sender?.permissions || [];
    const allowed = !!sender && !sender.disabled && sender.status === 'Active' && (
      role.includes('admin') || role === 'managing director' || role === 'manager' ||
      dept.includes('procurement') || perms.some((p) => (p || '').toLowerCase().includes('procurement'))
    );
    if (!allowed) return json({ ok: false, error: 'Only procurement staff and administrators can reply to companies' }, 403);

    const body = await req.json();
    const quotationId: string = body.quotationId;
    const message: string = (body.message || '').toString().trim();
    const subject: string = (body.subject || 'Regarding your quotation').toString().trim().slice(0, 150);
    const sendEmail: boolean = body.sendEmail === true;
    const sendSms: boolean = body.sendSms === true;

    if (!quotationId) return json({ ok: false, error: 'Quotation is required' }, 400);
    if (!message) return json({ ok: false, error: 'Message is required' }, 400);
    if (message.length > 900) return json({ ok: false, error: 'Message is too long (max 900 characters)' }, 400);
    if (!sendEmail && !sendSms) return json({ ok: false, error: 'Pick at least one channel' }, 400);

    const { data: quotation, error: qErr } = await admin
      .from('quotations')
      .select('id, company_name, contact_name, email, phone')
      .eq('id', quotationId)
      .maybeSingle();
    if (qErr || !quotation) return json({ ok: false, error: 'Quotation not found' }, 404);

    const recipientName = quotation.contact_name || quotation.company_name || 'Supplier';
    const logs: Array<Record<string, unknown>> = [];
    let emailSent = false;
    let smsSent = false;

    if (sendEmail) {
      const address = (quotation.email || '').trim();
      if (!address || !address.includes('@')) {
        logs.push({ quotation_id: quotationId, channel: 'email', body: message, subject, recipient: address || null, status: 'failed', error: 'No valid email address on the quotation', sent_by: sender!.email });
      } else {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            recipientEmail: address,
            templateName: 'general-notification',
            idempotencyKey: `quotation-${quotationId}-${Date.now()}`,
            templateData: { title: subject, subject, message, recipientName },
          }),
        });
        const ok = res.ok;
        const text = ok ? null : await res.text();
        emailSent = ok;
        logs.push({ quotation_id: quotationId, channel: 'email', body: message, subject, recipient: address, status: ok ? 'sent' : 'failed', error: text?.slice(0, 500) ?? null, sent_by: sender!.email });
      }
    }

    if (sendSms) {
      const phone = normalizePhone(quotation.phone);
      if (!phone) {
        logs.push({ quotation_id: quotationId, channel: 'sms', body: message, recipient: quotation.phone || null, status: 'failed', error: 'No valid phone number on the quotation', sent_by: sender!.email });
      } else {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            phone,
            message: message.slice(0, 480),
            messageType: 'quotation_reply',
            userName: recipientName,
            triggeredBy: sender!.email,
            priority: 'premium',
          }),
        });
        const ok = res.ok;
        const text = ok ? null : await res.text();
        smsSent = ok;
        logs.push({ quotation_id: quotationId, channel: 'sms', body: message, recipient: phone, status: ok ? 'sent' : 'failed', error: text?.slice(0, 500) ?? null, sent_by: sender!.email });
      }
    }

    if (logs.length) await admin.from('quotation_messages').insert(logs);

    const failed = logs.filter((l) => l.status === 'failed');
    return json({
      ok: failed.length === 0,
      emailSent,
      smsSent,
      error: failed.length ? failed.map((f) => f.error).join('; ') : undefined,
    });
  } catch (e) {
    console.error('quotation-notify failed:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
