import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { ownTestDestination, registeredPhone, deliveryAccepted } from '../_shared/message-policy.ts';

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
      .select('name, email, role, status, disabled, phone, alt_phone')
      .ilike('email', user.email)
      .maybeSingle();

    if (!sender || sender.disabled === true || !ADMIN_ROLES.includes(sender.role) || String(sender.status).toLowerCase() !== 'active') {
      return json({ ok: false, error: 'Only administrators can send company communications' }, 403);
    }

    const parsed = z.object({
      audience: z.enum(['employees', 'suppliers', 'both']).default('employees'),
      sendSms: z.boolean().default(true), sendEmail: z.boolean().default(false),
      subject: z.string().trim().min(1).max(150).default('Company Communication'),
      message: z.string().trim().min(1).max(900),
      testPhone: z.string().max(32).nullable().optional(),
      extraPhones: z.array(z.string().max(32)).max(20).default([]),
    }).strict().safeParse(await req.json());
    if (!parsed.success) return json({ ok: false, error: 'Choose a saved audience and a message of up to 900 characters.' }, 400);
    const body = parsed.data;
    const audience: string = body.audience || 'employees';
    const sendSms: boolean = body.sendSms !== false;
    const sendEmail: boolean = body.sendEmail === true;
    const subject: string = (body.subject || 'Company Communication').toString().trim().slice(0, 150);
    const message: string = (body.message || '').toString().trim();
    const testPhone: string | null = body.testPhone ? ownTestDestination('sms', body.testPhone, sender) : null;
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

      for (const p of extraPhones) {
        const recipient = await registeredPhone(admin, p);
        if (!recipient) return json({ ok: false, error: 'Additional recipients must be saved active contacts.' });
        phones.add(recipient.phone);
      }
    }

    // Saved-contact suppression takes precedence even when a number also belongs to a supplier.
    for (const phone of [...phones]) if (!await registeredPhone(admin, phone)) phones.delete(phone);
    const { data: recent, error: recentError } = await admin.from('broadcast_communications').select('id')
      .eq('created_by_email', sender.email).eq('message', message)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString()).limit(1);
    if (recentError) return json({ ok: false, error: 'The broadcast limit could not be checked.' });
    if (recent?.length) return json({ ok: false, error: 'Please wait before sending this same broadcast again.' });

    const phoneList = sendSms ? Array.from(phones) : [];
    const emailList = sendEmail && !testPhone ? Array.from(emails.entries()) : [];

    const { data: logRow, error: logError } = await admin
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
            message,
            messageType: 'company_broadcast',
            userName: 'Recipient',
            triggeredBy: sender.email,
          }),
        });
        if (deliveryAccepted(res.ok, await res.json())) smsSent++; else smsFailed++;
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
            templateData: {
              title: subject, subject, message, recipientName: name,
              ...(audience === 'employees' && subject === 'Happy International Coffee Day — September reports'
                ? { imageUrl: 'https://greatpearlcoffeesystem.site/__l5e/assets-v1/af5671ac-d575-4efd-9b16-d46b2379c1ce/international-coffee-day-2026.jpg' }
                : {}),
            },
          }),
        });
        if (deliveryAccepted(res.ok, await res.json())) emailsSent++; else emailsFailed++;
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
