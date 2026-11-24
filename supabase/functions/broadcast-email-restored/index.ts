import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";
import { registeredPhone, deliveryAccepted } from '../_shared/message-policy.ts';

// One-off staff notice (24 Nov 2026): the company email domain had expired and
// staff emails were not delivered; the domain was renewed and delivery restored.
// Fixed message only — no caller-supplied text — so this cannot become a general sender.
const MESSAGE = [
  'Great Agro Coffee: The email problem has been fixed and our emails are now being delivered normally.',
  'If you still cannot see them, please check your Junk/Spam folder.',
  'Sorry for the inconvenience. - IT & Operations',
].join(' ');

const SUBJECT = 'Email service restored';

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: employees, error } = await admin
      .from('employees')
      .select('name, email, phone, alt_phone')
      .eq('status', 'Active')
      .not('disabled', 'is', true);
    if (error) return json({ ok: false, error: error.message });

    const phones = new Set<string>();
    for (const e of employees || []) {
      for (const p of [e.phone, (e as any).alt_phone]) {
        const n = normalizePhone(p);
        if (n) phones.add(n);
      }
    }
    // Saved-contact suppression: only registered, active recipients.
    for (const phone of [...phones]) if (!await registeredPhone(admin, phone)) phones.delete(phone);

    const phoneList = Array.from(phones);

    const { data: logRow, error: logError } = await admin
      .from('broadcast_communications')
      .insert({
        audience: 'employees',
        channels: ['sms'],
        subject: SUBJECT,
        message: MESSAGE,
        sms_recipients: phoneList.length,
        email_recipients: 0,
        status: 'sending',
        created_by_name: 'Fauza Kelvis',
        created_by_email: 'Fauzakusa@greatpearlcoffee.com',
      })
      .select('id')
      .single();

    const logId = logRow?.id;
    if (logError || !logId) return json({ ok: false, error: 'The broadcast could not be registered. No messages were sent.' });

    let smsSent = 0;
    let smsFailed = 0;

    for (let i = 0; i < phoneList.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 350));
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            phone: phoneList[i],
            message: MESSAGE,
            messageType: 'company_broadcast',
            userName: 'Recipient',
            triggeredBy: 'Fauzakusa@greatpearlcoffee.com',
            requestId: logId,
          }),
        });
        if (deliveryAccepted(res.ok, await res.json())) smsSent++; else smsFailed++;
      } catch {
        smsFailed++;
      }
    }

    await admin
      .from('broadcast_communications')
      .update({
        sms_sent: smsSent,
        sms_failed: smsFailed,
        status: smsFailed === 0 ? 'sent' : (smsSent > 0 ? 'partial' : 'failed'),
      })
      .eq('id', logId);

    return json({ ok: true, smsRecipients: phoneList.length, smsSent, smsFailed });
  } catch (error) {
    console.error('broadcast-email-restored error:', error);
    return json({ ok: false, error: (error as Error).message });
  }
});
