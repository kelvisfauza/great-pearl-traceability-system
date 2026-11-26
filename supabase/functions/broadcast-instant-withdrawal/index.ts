import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret' };
const MARKER = 'broadcast_instant_withdrawal_2026_11_26';
const SMS = 'Great Agro Coffee: Mobile money withdrawals below UGX 30,000 are now processed automatically, no approval needed. Service charge applies. 30,000 and above follow normal approval.';
const EMAIL = 'Mobile money withdrawals below UGX 30,000 are now processed automatically by the system, with no approval needed. The usual service charge applies.\n\nWithdrawals of UGX 30,000 and above follow the normal approval process.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const denied = await requireInternalOrAdmin(req, cors);
  if (denied) return denied;
  const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...cors, 'Content-Type': 'application/json' } });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Resume: emails only, skipping staff already emailed (texts paused: no SMS credit).
  const { data: sent } = await db.from('sent_emails_log').select('recipient_email').eq('template_name', 'general-notification').eq('status', 'sent').gte('created_at', '2026-11-26T06:55:00Z');
  const already = new Set((sent || []).map((r: any) => String(r.recipient_email).toLowerCase()));
  const { data: emps, error } = await db.from('employees').select('name,email,disabled').eq('status', 'Active');
  if (error) return json({ ok: false, error: error.message });
  const todo = (emps || []).filter((e: any) => !e.disabled && e.email && !already.has(e.email.toLowerCase()));
  // Send one at a time with a pause: sending all at once hit the email rate limit.
  let mail = 0;
  for (const e of todo as any[]) {
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e.email) || /noauth\./i.test(e.email)) continue;
    const { data, error } = await db.functions.invoke('send-transactional-email', { body: { templateName: 'general-notification', recipientEmail: e.email, idempotencyKey: `${MARKER}-retry-${e.email}`, skipSms: true, templateData: { title: 'Faster Mobile Money Withdrawals', message: EMAIL, recipientName: e.name } } });
    if (!error && (data as any)?.success !== false) mail++;
    await new Promise(r => setTimeout(r, 2500));
  }
  const sms = 0; const failed = todo.length - mail;
  return json({ ok: true, sms, mail, failed });
});
