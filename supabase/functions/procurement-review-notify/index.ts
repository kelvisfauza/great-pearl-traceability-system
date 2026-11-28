import { requireStaff } from "../_shared/internal-auth.ts";
import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2.108.2/cors'
import { z } from 'npm:zod@3'
import { reviewNoticeAllowed, reviewNoticeAlreadySent } from './noticeRules.ts'

const SITE_NAME = 'Great Agro Coffee'
const SENDER_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const FROM_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'
const LOGO_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/great-agro-coffee-logo.png'
const REVIEW_URL = 'https://greatpearlcoffeesystem.site/procurement-review'
const APPROVALS_URL = 'https://greatpearlcoffeesystem.site/approvals'

const NoticeBody = z.object({
  mode: z.enum(['scan', 'returned', 'reviewed', 'meal_retry']).default('scan'),
  source_table: z.enum(['approval_requests', 'provider_submission_requests']).default('approval_requests'),
  record_id: z.string().trim().max(200).optional(),
})

const PENDING_STATUSES = [
  'Pending',
  'Pending Admin',
  'Pending Admin Approval',
  'Pending Admin 2',
  'Pending Finance',
  'Finance Approved',
]

function token(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const money = (n: unknown) => `UGX ${Number(n || 0).toLocaleString('en-UG')}`

// This sender supports one recipient, not CC; copy Operations explicitly and idempotently.
async function sendNoticeWithOperations(
  payload: Parameters<typeof sendLovableEmail>[0] & { cc?: string[] },
  options: Parameters<typeof sendLovableEmail>[1],
) {
  const { cc, ...notice } = payload
  const sent = await sendLovableEmail(notice, options)
  if (!sent.success) throw new Error('Email service did not accept the notice')
  if (cc?.includes(OPERATIONS_EMAIL) && notice.to !== OPERATIONS_EMAIL) {
    const key = options.idempotencyKey || notice.idempotency_key || ''
    const suffix = `-${notice.to}`
    const copyKey = `${key.endsWith(suffix) ? key.slice(0, -suffix.length) : key}-operations`
    const copy = await sendLovableEmail({ ...notice, to: OPERATIONS_EMAIL,
      html: `<p>Operations copy — original recipient: ${esc(notice.to)}</p>${notice.html}`,
      text: `Operations copy — original recipient: ${notice.to}\n${notice.text}`,
      idempotency_key: copyKey,
    }, { ...options, idempotencyKey: copyKey })
    if (!copy.success) throw new Error('Operations copy was not accepted')
  }
  return sent
}


const shell = (heading: string, body: string, ctaLabel: string, ctaUrl: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#7c2d12 0%,#b45309 100%);padding:28px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="56" height="56" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#fde68a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:700;">${esc(heading)}</h1>
        </td></tr>
        <tr><td style="padding:28px;">${body}
          <div style="text-align:center;margin:24px 0 6px;">
            <a href="${ctaUrl}" style="background:#b45309;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">${esc(ctaLabel)}</a>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:18px 28px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:13px;color:#374151;font-weight:600;">Great Agro Coffee &mdash; Member of YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Head Office &middot; P.O Box 431420, Kasese, Uganda &middot; Operations: +256 393 101 103</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const rowsTable = (rows: Array<Record<string, unknown>>) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;margin:8px 0 4px;">
  <tr style="background:#f3f4f6;">
    <th align="left" style="padding:8px 10px;border:1px solid #e5e7eb;">Request</th>
    <th align="left" style="padding:8px 10px;border:1px solid #e5e7eb;">Requested by</th>
    <th align="right" style="padding:8px 10px;border:1px solid #e5e7eb;">Amount</th>
  </tr>
  ${rows.map((r) => `<tr>
    <td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(r.title)}<div style="color:#6b7280;font-size:12px;">${esc(r.type)}</div></td>
    <td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(r.by)}</td>
    <td align="right" style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;">${esc(r.amount)}</td>
  </tr>`).join('')}
</table>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const caller = await requireStaff(req, corsHeaders);
  if (caller instanceof Response) return caller;

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

  const sendSms = async (phone: string, message: string, name: string, messageType: string) => {
    if (!phone) return
    try {
      await supabase.functions.invoke('send-sms', {
        body: { phone, message, userName: name, messageType },
      })
    } catch (e) {
      console.error('SMS failed', (e as Error)?.message)
    }
  }

  try {
    let input: unknown = {}
    try { input = req.method === 'POST' ? await req.json() : {} } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid request body.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const parsed = NoticeBody.safeParse(input)
    if (!parsed.success) return new Response(JSON.stringify({ ok: false, error: 'Invalid notice request.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const payload = parsed.data
    const mode = payload.mode
    if (mode === 'meal_retry') {
      if (!caller.internal) return json({ ok: false, error: 'Trusted notification worker required' })
      const { data: pending, error } = await supabase.from('procurement_reviews').select('record_id')
        .eq('source_table', 'provider_submission_requests').eq('decision', 'returned')
        .eq('returned_by', 'System automatic checks').is('return_notified_at', null).limit(50)
      if (error) return json({ ok: false, error: 'Could not load pending correction notices' })
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!serviceKey) return json({ ok: false, error: 'Notice service unavailable' })
      for (const review of pending || []) {
        await supabase.functions.invoke('procurement-review-notify', {
          headers: { Authorization: `Bearer ${serviceKey}` },
          body: { mode: 'returned', source_table: 'provider_submission_requests', record_id: review.record_id },
        })
      }
      await supabase.rpc('drain_meal_notice_retry')
      return json({ ok: true, checked: pending?.length || 0 })
    }
    let callerName: string | null = null
    if (!caller.internal && mode !== 'scan') {
      const { data: employee, error } = await supabase.from('employees').select('name,disabled,status,permissions').ilike('email', caller.email || '').maybeSingle()
      if (error || !employee || employee.disabled === true || ['inactive','terminated','disabled','suspended'].includes(String(employee.status ?? 'active').toLowerCase())) return json({ ok: false, error: 'Account unavailable.' })
      callerName = employee.name
      if (mode === 'returned') {
        const { data: roles, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', caller.userId)
        const permitted = !roleError && ((roles || []).some((r: { role: string }) => ['admin','administrator','super_admin'].includes(r.role.toLowerCase().replace(/ /g, '_'))) ||
          (Array.isArray(employee.permissions) && employee.permissions.some((p: string) => p === '*' || p === 'Administration')))
        if (!permitted) return json({ ok: false, error: 'Administrator permission required.' })
      }
    }

    // ---------------------------------------------------------------
    // MODE: returned — an admin sent the request back to procurement
    // ---------------------------------------------------------------
    if (mode === 'returned') {
      const sourceTable = String(payload.source_table || 'approval_requests')
      const recordId = String(payload.record_id || '')
      if (!recordId) return json({ ok: false, error: 'record_id is required' })

      const { data: review } = await supabase
        .from('procurement_reviews')
        .select('*')
        .eq('source_table', sourceTable)
        .eq('record_id', recordId)
        .maybeSingle()
      if (!review) return json({ ok: false, error: 'Review not found' })

      if (!reviewNoticeAllowed('returned', review, { ...caller, name: callerName })) return json({ ok: false, error: 'A saved return by the signed-in administrator is required.' })
      if (reviewNoticeAlreadySent('returned', review)) return json({ ok: true, already_notified: true })

      const { data: staff } = await supabase
        .from('employees')
        .select('name,email,phone,department,role,permissions,disabled,status')
        .not('email', 'is', null)

      // Non-admin procurement staff only (admins already know — they sent it back)
      const reviewers = (staff || []).filter((e: any) => {
        if (e.disabled === true) return false
        if (String(e.status || '').toLowerCase() === 'inactive') return false
        const dept = String(e.department || '').toLowerCase()
        const role = String(e.role || '').toLowerCase()
        const perms = Array.isArray(e.permissions) ? e.permissions.map((p: any) => String(p).toLowerCase()) : []
        if (role.includes('admin') || perms.includes('*')) return false
        return dept.includes('procurement') || role.includes('procurement') || perms.some((p: string) => p.includes('procurement'))
      })

      const systemCorrection = sourceTable === 'provider_submission_requests' && review.returned_by === 'System automatic checks'
      if (systemCorrection) {
        const { data: plan, error: planError } = await supabase.from('provider_submission_requests')
          .select('request_type,status,meal_correction_pending,auto_approval_note').eq('id', recordId).maybeSingle()
        if (planError || !plan || plan.request_type !== 'meal_plan' || plan.status !== 'awaiting_finance' || !plan.meal_correction_pending || plan.auto_approval_note !== review.return_reason) {
          return json({ ok: false, error: 'This correction is no longer awaiting Procurement' })
        }
      }
      let adminName = review.returned_by || 'Administrator'
      if (review.returned_by) {
        const { data: adm } = await supabase.from('employees').select('name').ilike('email', review.returned_by).maybeSingle()
        if (adm?.name) adminName = adm.name
      }

      const body = `
        <p style="font-size:15px;margin:0 0 14px;">Dear <strong>{{NAME}}</strong>,</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
          <strong>${esc(adminName)}</strong> has <strong>sent the request below back to procurement</strong> for changes.
          ${systemCorrection ? 'Admin approval is retained. Correct the listed items and amounts, then submit for automatic rechecking. Finance may approve the current plan first; if paid, do not submit another plan.' : 'Please review the instructions, correct the amount or details, and send it back for administrator approval.'}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;margin:8px 0 14px;">
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;width:180px;">Request</td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(review.request_title || 'Request')}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;">Requested by</td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(review.requested_by || 'N/A')}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;">Current amount</td><td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;">${money(review.amount)}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;">Returned by</td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(adminName)}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#fef3c7;font-weight:600;">What to change</td><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#fffbeb;">${esc(review.return_reason || 'See administrator instructions')}</td></tr>
        </table>`

      const results: any[] = []
      for (const person of reviewers) {
        const email = String(person.email).trim().toLowerCase()
        const idem = `proc-review-returned-${review.id}-${review.return_count || 1}-${email}`
        if (lovableApiKey) {
          try {
            await sendNoticeWithOperations({
              to: email,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: `Sent back for changes: ${review.request_title || 'Request'} — ${money(review.amount)}`,
              html: shell('REQUEST SENT BACK TO PROCUREMENT', body.replace('{{NAME}}', esc(person.name || 'Colleague')), 'Open Procurement Review', REVIEW_URL),
              text: `${adminName} sent "${review.request_title}" (${money(review.amount)}) back to procurement. Change required: ${review.return_reason}. Open ${REVIEW_URL}`,
              purpose: 'transactional',
              label: 'procurement-review-returned',
              idempotency_key: idem,
              unsubscribe_token: token(),
              cc: email === OPERATIONS_EMAIL ? [] : [OPERATIONS_EMAIL],
            }, { apiKey: lovableApiKey, idempotencyKey: idem })
            results.push({ email, email_status: 'sent' })
          } catch (e: any) {
            results.push({ email, email_status: `failed: ${e?.message}` })
          }
        }
        if (!systemCorrection) await sendSms(
          person.phone,
          `SENT BACK BY ADMIN: ${review.request_title || 'Request'} ${money(review.amount)}. ${adminName} asks: ${String(review.return_reason || '').slice(0, 90)}. Edit & resubmit at ${REVIEW_URL} - Great Agro Coffee`,
          person.name,
          'procurement_review_returned',
        )
      }

      const allAccepted = reviewers.length > 0 && results.length === reviewers.length && results.every(r => r.email_status === 'sent')
      if (allAccepted) await supabase.from('procurement_reviews').update({ return_notified_at: new Date().toISOString() }).eq('id', review.id).eq('return_count', review.return_count)
      if (systemCorrection) {
        const { error: trailError } = await supabase.from('meal_plan_events').insert({
          submission_id: recordId, event_type: allAccepted ? 'procurement_email_accepted' : 'procurement_email_failed',
          actor: 'System notification', reason: allAccepted ? 'Email service accepted the correction notices; Operations copied' : 'One or more correction emails were not accepted',
          after_data: { return_count: review.return_count, results },
        })
        if (trailError) return json({ ok: false, error: 'Could not record notification results', results })
      }
      if (systemCorrection && allAccepted) await supabase.rpc('drain_meal_notice_retry')
      return json({ ok: allAccepted, notified: reviewers.length, results })
    }

    // ---------------------------------------------------------------
    // MODE: reviewed — procurement has decided; notify the chosen admin
    // ---------------------------------------------------------------
    if (mode === 'reviewed') {
      const sourceTable = String(payload.source_table || 'approval_requests')
      const recordId = String(payload.record_id || '')
      if (!recordId) return json({ ok: false, error: 'record_id is required' })

      const { data: review } = await supabase
        .from('procurement_reviews')
        .select('*')
        .eq('source_table', sourceTable)
        .eq('record_id', recordId)
        .maybeSingle()

      if (!review) return json({ ok: false, error: 'Review not found' })

      if (!reviewNoticeAllowed('reviewed', review, { ...caller, name: callerName })) return json({ ok: false, error: 'A saved decision by the signed-in reviewer is required.' })
      if (reviewNoticeAlreadySent('reviewed', review)) return json({ ok: true, already_notified: true })

      let recipients: Array<{ name: string; email: string; phone: string }> = []
      if (review.recommended_admin_email) {
        const { data: adm } = await supabase
          .from('employees')
          .select('name,email,phone')
          .ilike('email', review.recommended_admin_email)
          .maybeSingle()
        recipients = [{
          name: adm?.name || review.recommended_admin_name || 'Administrator',
          email: String(review.recommended_admin_email).toLowerCase(),
          phone: adm?.phone || '',
        }]
      } else {
        const { data: admins } = await supabase
          .from('employees')
          .select('name,email,phone,role,disabled')
          .not('email', 'is', null)
        recipients = (admins || [])
          .filter((a: any) => a.disabled !== true && String(a.role || '').toLowerCase().includes('admin'))
          .map((a: any) => ({ name: a.name, email: String(a.email).toLowerCase(), phone: a.phone || '' }))
      }

      const approved = review.decision === 'approved'
      const heading = approved ? 'PROCUREMENT REVIEWED — READY FOR YOUR APPROVAL' : 'PROCUREMENT REJECTED A REQUEST'
      const amountLine = review.edited_amount && Number(review.edited_amount) !== Number(review.original_amount || 0)
        ? `${money(review.edited_amount)} <span style="color:#6b7280;text-decoration:line-through;">${money(review.original_amount)}</span>`
        : money(review.amount)

      const body = `
        <p style="font-size:15px;margin:0 0 14px;">Dear <strong>{{NAME}}</strong>,</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
          <strong>${esc(review.reviewed_by || 'Procurement')}</strong> has <strong>${approved ? 'reviewed and cleared' : 'rejected'}</strong>
          the request below at procurement stage${approved ? ' and forwarded it to you for final approval' : ''}.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;margin:8px 0 14px;">
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;width:180px;">Request</td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(review.request_title || 'Request')}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;">Requested by</td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(review.requested_by || 'N/A')}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;">Amount</td><td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;">${amountLine}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;">Procurement decision</td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${approved ? 'Approved at procurement' : 'Rejected at procurement'}</td></tr>
          <tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;">Observations</td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(review.notes || 'None provided')}</td></tr>
        </table>`

      const results: any[] = []
      for (const r of recipients) {
        const html = shell(heading, body.replace('{{NAME}}', esc(r.name)), 'Open Approvals', APPROVALS_URL)
        const idem = `proc-review-${review.id}-${r.email}`
        if (lovableApiKey) {
          try {
            await sendNoticeWithOperations({
              to: r.email,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: `${approved ? 'Ready for your approval' : 'Rejected at procurement'}: ${review.request_title || 'Request'} — ${money(review.amount)}`,
              html,
              text: `${review.reviewed_by} ${approved ? 'cleared' : 'rejected'} "${review.request_title}" (${money(review.amount)}) at procurement. Notes: ${review.notes || 'none'}. Open ${APPROVALS_URL}`,
              purpose: 'transactional',
              label: 'procurement-review-decision',
              idempotency_key: idem,
              unsubscribe_token: token(),
              cc: r.email === OPERATIONS_EMAIL ? [] : [OPERATIONS_EMAIL],
            }, { apiKey: lovableApiKey, idempotencyKey: idem })
            results.push({ email: r.email, email_status: 'sent' })
          } catch (e: any) {
            results.push({ email: r.email, email_status: `failed: ${e?.message}` })
          }
        }
        await sendSms(
          r.phone,
          `${approved ? 'FOR YOUR APPROVAL' : 'PROCUREMENT REJECTED'}: ${review.request_title || 'Request'} ${money(review.amount)} was ${approved ? 'cleared' : 'rejected'} by ${review.reviewed_by || 'Procurement'}. ${review.notes ? 'Note: ' + String(review.notes).slice(0, 80) : ''} - Great Agro Coffee`,
          r.name,
          'procurement_review_decision',
        )
      }

      await supabase
        .from('procurement_reviews')
        .update({ admin_notified_at: new Date().toISOString() })
        .eq('id', review.id)

      return json({ ok: true, notified: recipients.length, results })
    }

    // ---------------------------------------------------------------
    // MODE: scan — new money requests awaiting procurement review
    // ---------------------------------------------------------------
    const { data: pendingRequests } = await supabase
      .from('approval_requests')
      .select('id,title,type,amount,requestedby,requestedby_name,status,created_at')
      .in('status', PENDING_STATUSES)
      .order('created_at', { ascending: false })
      .limit(200)

    const { data: pendingProvider } = await supabase
      .from('provider_submission_requests')
      .select('id,request_type,provider_name,amount,description,status,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200)

    const PROVIDER_LABEL: Record<string, string> = {
      meal_plan: 'Meal Plan',
      service_provider: 'Service Provider Payment',
      support_staff_per_diem: 'Support Staff Per Diem',
    }

    type Candidate = {
      source_table: string
      id: string
      title: string
      type: string
      amount: number
      by: string
    }

    const candidates: Candidate[] = [
      ...(pendingRequests || [])
        .filter((r: any) => String(r.type || '').toLowerCase() !== 'leave')
        .map((r: any) => ({
          source_table: 'approval_requests',
          id: r.id,
          title: r.title,
          type: r.type,
          amount: Number(r.amount) || 0,
          by: r.requestedby_name || r.requestedby || 'Unknown',
        })),
      ...(pendingProvider || []).map((r: any) => ({
        source_table: 'provider_submission_requests',
        id: r.id,
        title: `${PROVIDER_LABEL[String(r.request_type)] || 'Provider Request'} — ${r.provider_name || 'Unnamed'}`,
        type: PROVIDER_LABEL[String(r.request_type)] || String(r.request_type || 'Provider Request'),
        amount: Number(r.amount) || 0,
        by: r.provider_name || 'Unknown',
      })),
    ]

    if (candidates.length === 0) return json({ ok: true, message: 'Nothing pending' })

    const { data: existing } = await supabase
      .from('procurement_reviews')
      .select('source_table,record_id')
      .in('record_id', candidates.map((r) => r.id))

    const known = new Set((existing || []).map((r: any) => `${r.source_table}:${r.record_id}`))
    const fresh = candidates.filter((r) => !known.has(`${r.source_table}:${r.id}`))
    if (fresh.length === 0) return json({ ok: true, message: 'No new requests to review' })

    // Register them as awaiting procurement review
    await supabase.from('procurement_reviews').insert(
      fresh.map((r) => ({
        source_table: r.source_table,
        record_id: r.id,
        request_title: r.title,
        requested_by: r.by,
        amount: r.amount,
        original_amount: r.amount,
        decision: 'pending',
        notified_at: new Date().toISOString(),
      })),
    )


    // Procurement reviewers
    const { data: staff } = await supabase
      .from('employees')
      .select('name,email,phone,department,role,permissions,disabled,status')
      .not('email', 'is', null)

    const reviewers = (staff || []).filter((e: any) => {
      if (e.disabled === true) return false
      if (String(e.status || '').toLowerCase() === 'inactive') return false
      const dept = String(e.department || '').toLowerCase()
      const role = String(e.role || '').toLowerCase()
      const perms = Array.isArray(e.permissions) ? e.permissions.map((p: any) => String(p).toLowerCase()) : []
      // Admins already get the approval alerts — don't double-notify them here
      if (role.includes('admin') || perms.includes('*')) return false
      return dept.includes('procurement') || role.includes('procurement') || perms.some((p: string) => p.includes('procurement'))
    })

    const rows = fresh.map((r) => ({
      title: r.title,
      type: r.type,
      by: r.by,
      amount: money(r.amount),
    }))

    const total = fresh.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0)

    const results: any[] = []
    for (const person of reviewers) {
      const email = String(person.email).trim().toLowerCase()
      const body = `
        <p style="font-size:15px;margin:0 0 14px;">Dear <strong>${esc(person.name || 'Colleague')}</strong>,</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
          <strong>${fresh.length}</strong> money request${fresh.length === 1 ? '' : 's'} totalling
          <strong>${money(total)}</strong> ${fresh.length === 1 ? 'is' : 'are'} waiting for your procurement review.
          Review, correct or reject ${fresh.length === 1 ? 'it' : 'them'}, then choose the administrator who should give final approval.
        </p>
        ${rowsTable(rows)}`
      const idem = `proc-review-pending-${fresh[0].id}-${email}`
      if (lovableApiKey) {
        try {
          await sendNoticeWithOperations({
            to: email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: `${fresh.length} request${fresh.length === 1 ? '' : 's'} awaiting your procurement review — ${money(total)}`,
            html: shell('AWAITING YOUR PROCUREMENT REVIEW', body, 'Review Requests', REVIEW_URL),
            text: `${fresh.length} money request(s) totalling ${money(total)} await your procurement review. Open ${REVIEW_URL}`,
            purpose: 'transactional',
            label: 'procurement-review-pending',
            idempotency_key: idem,
            unsubscribe_token: token(),
            cc: email === OPERATIONS_EMAIL ? [] : [OPERATIONS_EMAIL],
          }, { apiKey: lovableApiKey, idempotencyKey: idem })
          results.push({ email, email_status: 'sent' })
        } catch (e: any) {
          results.push({ email, email_status: `failed: ${e?.message}` })
        }
      }
      await sendSms(
        person.phone,
        `PROCUREMENT REVIEW: ${fresh.length} request(s) totalling ${money(total)} await your review before admin approval. Open ${REVIEW_URL} - Great Agro Coffee`,
        person.name,
        'procurement_review_pending',
      )
    }

    return json({ ok: true, new_requests: fresh.length, reviewers: reviewers.length, results })
  } catch (e: any) {
    console.error('procurement-review-notify error:', e?.message || e)
    return json({ ok: false, error: e?.message || 'Unexpected error' })
  }
})
