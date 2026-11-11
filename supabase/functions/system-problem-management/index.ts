import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { classifyProblem, ESCALATION_EMAIL } from '../_shared/problem-resolution-rules.ts';

const Input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('report'), id: z.string().uuid(), subject: z.string().trim().min(3).max(200), message: z.string().trim().min(5).max(4000), area: z.string().trim().min(1).max(120), priority: z.enum(['medium', 'high', 'urgent']) }),
  z.object({ action: z.enum(['escalate', 'investigate', 'resolve']), id: z.string().uuid(), note: z.string().trim().min(5).max(2000) }),
]);
Deno.serve(async req => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return reply({ ok: true });
  if (req.method !== 'POST') return reply({ ok: false, error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ ok: false, error: 'Problem reporting unavailable' });
    const client = createClient(url, key, { auth: { persistSession: false } });
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return reply({ ok: false, error: 'Sign in required' }, 401);
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user?.email) return reply({ ok: false, error: 'Invalid session' }, 401);
    const { data: personId, error: identityError } = await client.rpc('get_unified_user_id', { input_email: auth.user.email });
    const personQuery = client.from('employees').select('name,disabled');
    const { data: person, error: personError } = await (/^[0-9a-f-]{36}$/i.test(personId || '') ? personQuery.eq('auth_user_id', personId) : personQuery.ilike('email', auth.user.email)).maybeSingle();
    const { data: roles, error: roleError } = await client.from('user_roles').select('role').eq('user_id', auth.user.id).in('role', ['Administrator', 'Super Admin']);
    if (identityError || personError || roleError || !person || person.disabled === true || !roles?.length) return reply({ ok: false, error: 'Administrator access required' }, 403);
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return reply({ ok: false, error: 'Check the required fields and length limits' }, 400);
    const input = parsed.data;
    if (input.action === 'report') {
      const { data: existing, error: existingError } = await client.from('support_tickets').select('id,ticket_code,source').eq('id', input.id).maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        if (existing.source !== 'system_settings') return reply({ ok: false, error: 'Reference already in use' });
        return reply({ ok: true, ticket_code: existing.ticket_code });
      }
      const diagnosis = classifyProblem(input.message);
      const { data: code, error: codeError } = await client.rpc('generate_support_ticket_code');
      if (codeError) throw codeError;
      const { error } = await client.from('support_tickets').insert({ id: input.id, ticket_code: code, customer_name: person.name, customer_email: auth.user.email, subject: input.subject, message: input.message, category: input.area, priority: input.priority, status: 'open', source: 'system_settings', metadata: { diagnosis: diagnosis.kind, reported_by: auth.user.id } });
      if (error) throw error;
      return reply({ ok: true, ticket_code: code });
    }
    const { data: ticket, error: ticketError } = await client.from('support_tickets').select('*').eq('id', input.id).eq('source', 'system_settings').single();
    if (ticketError || !ticket) return reply({ ok: false, error: 'System problem not found' });
    const metadata = { ...ticket.metadata, last_note: input.note, last_actor: person.name, last_action_at: new Date().toISOString() };
    if (input.action === 'escalate') {
      const { error: pendingError } = await client.from('support_tickets').update({ metadata: { ...metadata, escalation_status: 'pending', escalation_recipient: ESCALATION_EMAIL }, updated_at: new Date().toISOString() }).eq('id', ticket.id);
      if (pendingError) throw pendingError;
      const diagnosis = classifyProblem(ticket.message);
      const { data, error } = await client.functions.invoke('send-transactional-email', { body: { templateName: 'general-notification', recipientEmail: ESCALATION_EMAIL, skipSms: true, idempotencyKey: `system-problem-${ticket.id}`, templateData: { subject: `[System problem ${ticket.ticket_code}] ${ticket.subject}`, title: 'System problem escalated', recipientName: 'Fauza', message: `Reference: ${ticket.ticket_code}\nArea: ${ticket.category}\nReported by: ${ticket.customer_name}\nEscalated by: ${person.name}\nPriority: ${ticket.priority}\nAssessment: ${diagnosis.label} (not a confirmed cause)\n\n${ticket.message}\n\nReview note: ${input.note}\n\n${diagnosis.action}`, ctaUrl: 'https://greatpearlcoffeesystem.site/admin/system-settings?tool=problem-resolution', ctaLabel: 'Review problem' } } });
      const delivered = !error && data?.ok === true && data?.email_status === 'sent';
      const { error: saveError } = await client.from('support_tickets').update({ metadata: { ...metadata, escalation_status: delivered ? 'sent' : 'failed', escalation_recipient: ESCALATION_EMAIL }, updated_at: new Date().toISOString() }).eq('id', ticket.id);
      if (saveError) throw saveError;
      return reply({ ok: delivered, error: delivered ? undefined : 'Problem saved, but email delivery was not confirmed. Retry escalation.', ticket_code: ticket.ticket_code });
    }
    const { error } = await client.from('support_tickets').update({ status: input.action === 'resolve' ? 'resolved' : 'in-progress', resolved_at: input.action === 'resolve' ? new Date().toISOString() : null, assigned_to: auth.user.id, metadata, updated_at: new Date().toISOString() }).eq('id', ticket.id);
    if (error) throw error;
    return reply({ ok: true });
  } catch {
    return reply({ ok: false, error: 'Could not complete the action. No payment or balance was changed.' });
  }
});