import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { mealReceiptEvidence } from '../_shared/meal-receipt-rules.ts';

const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) return reply({ ok: false, error: 'Receipt lookup is temporarily unavailable.' });
    const header = req.headers.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) return reply({ ok: false, error: 'Please sign in again.' }, 401);
    const caller = createClient(url, anon, { global: { headers: { Authorization: header } } });
    const { data: auth, error: authError } = await caller.auth.getClaims(header.slice(7));
    if (authError || !auth?.claims?.sub || !auth.claims.email) return reply({ ok: false, error: 'Please sign in again.' }, 401);
    const body = await req.json();
    if (typeof body.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.submissionId)) return reply({ ok: false, error: 'Choose a saved meal-plan request.' }, 400);
    const db = createClient(url, service);
    const [{ data: employee, error: employeeError }, procurement, finance, admin, superAdmin] = await Promise.all([
      db.from('employees').select('status,disabled').ilike('email', String(auth.claims.email)).maybeSingle(),
      caller.rpc('is_procurement_reviewer', { _user_id: auth.claims.sub }),
      caller.rpc('user_has_permission', { permission_name: 'Finance' }),
      caller.rpc('has_role', { _user_id: auth.claims.sub, _role: 'Administrator' }),
      caller.rpc('has_role', { _user_id: auth.claims.sub, _role: 'Super Admin' }),
    ]);
    if (employeeError || [procurement, finance, admin, superAdmin].some(r => r.error)) return reply({ ok: false, error: 'Receipt access could not be checked. Please try again.' });
    if (!employee || employee.disabled || employee.status?.toLowerCase() !== 'active' || ![procurement, finance, admin, superAdmin].some(r => r.data === true)) return reply({ ok: false, error: 'Only active Procurement, Finance and administrators can print these receipts.' }, 403);
    const { data: request, error: requestError } = await db.from('provider_submission_requests')
      .select('id,request_type,provider_name,phone,amount,description,invoice_number,paper_document_number,status,payout_status,payout_record_id,admin_approved_by_name,finance_released_by_name,reviewed_at')
      .eq('id', body.submissionId).maybeSingle();
    if (requestError) throw requestError;
    if (!request || request.request_type !== 'meal_plan' || !request.payout_record_id) return reply({ ok: false, error: 'No completed meal payment is linked to this request.' });
    const { data: payment, error: paymentError } = await db.from('meal_disbursements')
      .select('id,amount,withdraw_charge,total_amount,receiver_name,receiver_phone,yo_status,yo_reference,created_at,updated_at')
      .eq('id', request.payout_record_id).maybeSingle();
    if (paymentError) throw paymentError;
    if (!mealReceiptEvidence(request, payment)) return reply({ ok: false, error: 'Payment is not confirmed. Admin approval alone is not a payment receipt.' });
    const { data: receipts, error: receiptError } = await db.from('generated_receipts')
      .select('reference').eq('source_id', request.id).order('created_at', { ascending: false }).limit(1);
    if (receiptError) throw receiptError;
    return reply({ ok: true, request, payment, reference: receipts?.[0]?.reference || payment?.yo_reference || `MEAL-${request.payout_record_id}` });
  } catch (error) {
    console.error('Meal receipt read failed', error instanceof Error ? error.message : 'Unknown error');
    return reply({ ok: false, error: 'The saved payment receipt could not be loaded. Please try again.' });
  }
});