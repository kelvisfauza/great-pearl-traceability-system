import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import { requireInternalOrAdmin } from '../_shared/internal-auth.ts'

// Emails each released salary's payslip as a PDF attachment from the company Operations mailbox, always copying Operations.
const SENDER = 'operations@greatpearlcoffee.com'
const GATEWAY = 'https://connector-gateway.lovable.dev/azure_graph'
const money = (v: unknown) => Number(v || 0).toLocaleString()
const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const deny = await requireInternalOrAdmin(req, corsHeaders); if (deny) return deny
  try {
    const gk = Deno.env.get('LOVABLE_API_KEY'), ck = Deno.env.get('AZURE_GRAPH_API_KEY')
    if (!gk || !ck) return json({ ok: false, error: 'Microsoft 365 connection is not configured' })
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, key)
    const body = await req.json().catch(() => ({}))
    const month = typeof body.month === 'string' && body.month.length < 30 ? body.month : new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' })
    let q = sb.from('employee_salary_payments').select('*').eq('status', 'completed').not('finance_ledger_id', 'is', null)
    q = Array.isArray(body.paymentIds) && body.paymentIds.length ? q.in('id', body.paymentIds.slice(0, 100)) : q.eq('payment_month', month).limit(100)
    const { data: payments, error } = await q
    if (error) throw error
    const sent: any[] = [], failed: any[] = []
    for (const p of payments || []) {
      if (!isEmail(p.employee_email)) { failed.push({ employee: p.employee_name, error: 'No valid email' }); continue }
      try {
        const gross = Number(p.gross_salary || p.salary_amount || 0), nssf = Number(p.nssf_employee || 0), paye = Number(p.paye || 0)
        const adv = Number(p.advance_deduction || 0) + Number(p.time_deduction || 0), net = Number(p.net_salary || 0)
        const pm = p.payment_month || month
        const { data: slip, error: sErr } = await sb.functions.invoke('generate-payslip', { headers: { Authorization: `Bearer ${key}` }, body: {
          employeeName: p.employee_name, employeeEmail: p.employee_email, employeeId: p.employee_id || '', department: p.department || '',
          month: pm, grossSalary: gross, advanceDeduction: adv, netSalary: net, paymentMethod: 'Wallet',
          transactionId: p.transaction_id || `SAL-${p.id}`,
          processedDate: new Date(p.completed_at || Date.now()).toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala' }),
          nssfEmployee: nssf, nssfEmployer: Number(p.nssf_employer || 0), paye } })
        if (sErr || !slip?.fileName) throw new Error('Payslip could not be generated')
        const { data: file, error: dErr } = await sb.storage.from('statements').download(slip.fileName)
        if (dErr || !file) throw new Error('Payslip file could not be read')
        const pdf = encodeBase64(new Uint8Array(await file.arrayBuffer()))
        const name = esc(p.employee_name || 'Staff member')
        const html = `<p>Dear ${name},</p><p>Please find attached your payslip for <b>${esc(pm)}</b>.</p><p>Net salary credited to your wallet: <b>UGX ${money(net)}</b>.</p><p>You can use this payslip with banks; scan its QR code to confirm it is genuine.</p><p>Regards,<br>Great Agro Coffee<br>A member of YEDA COFFEE COMPANY LIMITED</p>`
        const r = await fetch(`${GATEWAY}/v1.0/users/${SENDER}/sendMail`, { method: 'POST', headers: { Authorization: `Bearer ${gk}`, 'X-Connection-Api-Key': ck, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
          body: JSON.stringify({ saveToSentItems: true, message: { subject: `Your payslip - ${pm}`, body: { contentType: 'HTML', content: html },
            toRecipients: [{ emailAddress: { address: p.employee_email } }], ccRecipients: [{ emailAddress: { address: SENDER } }],
            attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: `Payslip_${String(p.employee_name).replace(/[^A-Za-z0-9]+/g, '_')}_${pm.replace(/\s+/g, '_')}.pdf`, contentType: 'application/pdf', contentBytes: pdf }] } }) })
        if (!r.ok) throw new Error(`Microsoft returned ${r.status}: ${(await r.text()).slice(0, 300)}`)
        await sb.from('audit_logs').insert({ action: 'payslip_pdf_emailed', table_name: 'employee_salary_payments', record_id: p.id, performed_by: SENDER, reason: `Payslip ${pm} emailed as PDF, Operations copied` })
        sent.push({ employee: p.employee_name })
      } catch (e) { failed.push({ employee: p.employee_name, error: (e as Error).message }) }
      await new Promise(r => setTimeout(r, 800))
    }
    return json({ ok: true, month, checked: payments?.length || 0, sent, failed })
  } catch (e) { return json({ ok: false, error: (e as Error).message }) }
})
