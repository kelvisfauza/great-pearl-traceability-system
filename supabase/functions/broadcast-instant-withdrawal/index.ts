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

  const { data: done } = await db.from('audit_logs').select('id').eq('action', MARKER).limit(1);
  if (done?.length) return json({ ok: false, error: 'already_sent' });
  await db.from('audit_logs').insert({ action: MARKER, table_name: 'employees', record_id: MARKER, performed_by: 'System broadcast', reason: 'Instant withdrawal announcement' });

  const { data: emps, error } = await db.from('employees').select('name,email,phone,disabled').eq('status', 'Active');
  if (error) return json({ ok: false, error: error.message });
  let sms = 0, mail = 0; const failed: string[] = [];
  for (const e of (emps || []).filter((x: any) => !x.disabled)) {
    if (e.phone) {
      const { data, error } = await db.functions.invoke('send-sms', { body: { phone: e.phone, message: SMS, userName: e.name, messageType: 'hr_notification' } });
      if (!error && (data as any)?.success !== false) sms++; else failed.push(`sms:${e.name}`);
    }
    if (e.email) {
      const { error } = await db.functions.invoke('send-transactional-email', { body: { templateName: 'general-notification', recipientEmail: e.email, idempotencyKey: `${MARKER}-${e.email}`, skipSms: true, templateData: { title: 'Faster Mobile Money Withdrawals', message: EMAIL, recipientName: e.name } } });
      if (!error) mail++; else failed.push(`email:${e.name}`);
    }
  }
  return json({ ok: true, sms, mail, failed });
});
