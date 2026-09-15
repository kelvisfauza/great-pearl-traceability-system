import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_ROLES = ['Administrator', 'Super Admin', 'Managing Director'];

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
      .select('name, email, role, status')
      .ilike('email', user.email)
      .maybeSingle();

    if (!sender || !ADMIN_ROLES.includes(sender.role) || sender.status !== 'Active') {
      return json({ ok: false, error: 'Only administrators can send company communications' }, 403);
    }

    const body = await req.json();
    const audience: string = body.audience || 'employees';
    const sendSms: boolean = body.sendSms !== false;
    const sendEmail: boolean = body.sendEmail === true;
    const subject: string = (body.subject || 'Company Communication').toString().trim().slice(0, 150);
    const message: string = (body.message || '').toString().trim();
    const testPhone: string | null = body.testPhone ? normalizePhone(body.testPhone) : null;
    const extraPhones: string[] = Array.isArray(body.extraPhones) ? body.extraPhones : [];

    if (!message) return json({ ok: false, error: 'Message is required' }, 400);
    if (message.length > 900) return json({ ok: false, error: 'Message is too long (max 900 characters)' }, 400);
    if (!sendSms && !sendEmail) return json({ ok: false, error: 'Pick at least one channel' }, 400);

    const wantEmployees = audience === 'employees' || audience === 'both';
    const wantSuppliers = audience === 'suppliers' || audience === 'both';

    const phones = new Set<string>();
    const emails = new Map<string, string>(); // email -> name

    if (testPhone) {
      phones.add(testPhone);
    } else {
      if (wantEmployees) {
        const { data: employees } = await admin
          .from('employees')
          .select('name, email, phone, alt_phone, role')
          .eq('status', 'Active')
          .not('disabled', 'is', true);
        for (const e of employees || []) {
          for (const p of [e.phone, (e as any).alt_phone]) {
            const n = normalizePhone(p);
            if (n) phones.add(n);
          }
          if (e.email) emails.set(e.email.toLowerCase(), e.name || 'Team member');
        }
      }

      if (wantSuppliers) {
        const [sup, fieldSup, farmers, agents] = await Promise.all([
          admin.from('suppliers').select('name, phone, email'),
          admin.from('field_assessment_suppliers').select('supplier_name, phone'),
          admin.from('farmer_profiles').select('full_name, phone'),
          admin.from('field_agents').select('name, phone'),
        ]);
        for (const s of sup.data || []) {
          const n = normalizePhone(s.phone);
          if (n) phones.add(n);
          if (s.email) emails.set(String(s.email).toLowerCase(), s.name || 'Supplier');
        }
        for (const s of fieldSup.data || []) { const n = normalizePhone(s.phone); if (n) phones.add(n); }
        for (const f of farmers.data || []) { const n = normalizePhone(f.phone); if (n) phones.add(n); }
        for (const a of agents.data || []) { const n = normalizePhone(a.phone); if (n) phones.add(n); }
      }

      for (const p of extraPhones) { const n = normalizePhone(p); if (n) phones.add(n); }
    }

    const phoneList = sendSms ? Array.from(phones) : [];
    const emailList = sendEmail && !testPhone ? Array.from(emails.entries()) : [];

    const { data: logRow } = await admin
      .from('broadcast_communications')
      .insert({
        audience: testPhone ? 'test' : audience,
        channels: [sendSms ? 'sms' : null, sendEmail ? 'email' : null].filter(Boolean),
        subject,
        message,
        sms_recipients: phoneList.length,
        email_recipients: emailList.length,
        status: 'sending',
        created_by_name: sender.name,
        created_by_email: sender.email,
      })
      .select('id')
      .single();

    const logId = logRow?.id;

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
            message,
            messageType: 'company_broadcast',
            userName: 'Recipient',
            triggeredBy: sender.email,
          }),
        });
        if (res.ok) smsSent++; else smsFailed++;
      } catch {
        smsFailed++;
      }
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    for (let i = 0; i < emailList.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1200));
      const [addr, name] = emailList[i];
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            templateName: 'general-notification',
            recipientEmail: addr,
            idempotencyKey: `broadcast-${logId}-${addr}`,
            templateData: { title: subject, subject, message, recipientName: name },
          }),
        });
        if (res.ok) emailsSent++; else emailsFailed++;
      } catch {
        emailsFailed++;
      }
    }

    if (logId) {
      await admin
        .from('broadcast_communications')
        .update({
          sms_sent: smsSent,
          sms_failed: smsFailed,
          emails_sent: emailsSent,
          emails_failed: emailsFailed,
          status: smsFailed + emailsFailed === 0 ? 'sent' : (smsSent + emailsSent > 0 ? 'partial' : 'failed'),
        })
        .eq('id', logId);
    }

    return json({
      ok: true,
      smsRecipients: phoneList.length,
      smsSent,
      smsFailed,
      emailRecipients: emailList.length,
      emailsSent,
      emailsFailed,
    });
  } catch (error) {
    console.error('send-broadcast error:', error);
    return json({ ok: false, error: (error as Error).message }, 200);
  }
});
