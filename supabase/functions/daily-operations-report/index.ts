// Daily Operations Report — auto-generated at 8pm (Africa/Kampala)
// Builds a PDF covering purchases, sales, dispatch/trucks, quality, milling,
// collections, EUDR dispatch monitoring and the most active users for the day,
// stores it, then emails every admin (with a download link) and SMSes them.
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { jsPDF } from 'npm:jspdf@2.5.2'
import autoTableMod from 'npm:jspdf-autotable@3.8.4'

const autoTable: any = (autoTableMod as any).default ?? autoTableMod

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'Great Agro Coffee'
const SENDER_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const FROM_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const BUCKET = 'daily-reports'
const TZ_OFFSET = '+03:00' // Africa/Kampala

function token(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

function kampalaToday(): string {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().split('T')[0]
}

const num = (v: any) => Number(v) || 0
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const money = (n: number) => `UGX ${fmt(n)}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

    let body: any = {}
    try { body = await req.json() } catch { /* cron sends no body */ }

    const date: string = body.date || kampalaToday()
    const testEmail: string | null = body.testEmail || null
    const skipSms: boolean = body.skipSms === true || !!testEmail

    const from = `${date}T00:00:00${TZ_OFFSET}`
    const to = `${date}T23:59:59${TZ_OFFSET}`
    const fromIso = new Date(from).toISOString()
    const toIso = new Date(to).toISOString()

    // ─────────── Gather ───────────
    const [
      purchases, sales, quality, dispatchAnalyses, eudrDispatches,
      millingTx, millingJobs, millingCash, activity, admins, ledger,
    ] = await Promise.all([
      supabase.from('coffee_records')
        .select('batch_number, supplier_name, coffee_type, kilograms, bags, status')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('sales_transactions')
        .select('customer, coffee_type, weight, unit_price, total_amount, truck_details, driver_details, status')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('quality_assessments')
        .select('batch_number, moisture, group1_defects, group2_defects, outturn, final_price, suggested_price, status, assessed_by, form_number')
        .eq('date_assessed', date),
      supabase.from('quality_dispatch_analyses')
        .select('analysis_number, truck_serial_number, vehicle_registration, destination_buyer, coffee_type, bags_loaded, total_weight_kg, moisture_content, outturn, verdict, sampled_by, analysed_by, status')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('eudr_dispatch_reports')
        .select('dispatch_date, dispatch_location, coffee_type, destination_buyer, trucks, vehicle_registrations, bags_deducted, total_deducted_weight, status')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('milling_transactions')
        .select('customer_name, kgs_hulled, rate_per_kg, total_amount, amount_paid, balance, transaction_type')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('milling_jobs')
        .select('job_number, customer_name, coffee_type, input_weight_kg, output_weight_kg, total_cost, amount_paid, status')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('milling_cash_transactions')
        .select('customer_name, amount_paid, payment_method')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('user_activity')
        .select('user_id, activity_type')
        .gte('created_at', fromIso).lte('created_at', toIso),
      supabase.from('employees')
        .select('id, name, email, phone, role, auth_user_id')
        .eq('status', 'Active').eq('role', 'Administrator'),
      supabase.from('ledger_entries')
        .select('entry_type, source_category, amount')
        .gte('created_at', fromIso).lte('created_at', toIso),
    ])

    const P = purchases.data || []
    const S = sales.data || []
    const Q = quality.data || []
    const DA = dispatchAnalyses.data || []
    const ED = eudrDispatches.data || []
    const MT = millingTx.data || []
    const MJ = millingJobs.data || []
    const MC = millingCash.data || []
    const ACT = activity.data || []
    const ADMINS = admins.data || []
    const LE = ledger.data || []

    // ─────────── Wallet / system money movements for the day ───────────
    const sumWhere = (fn: (r: any) => boolean) =>
      LE.filter(fn).reduce((s, r) => s + Math.abs(num(r.amount)), 0)
    const countWhere = (fn: (r: any) => boolean) => LE.filter(fn).length
    const type = (r: any) => String(r.entry_type || '').toUpperCase()
    const cat = (r: any) => String(r.source_category || '').toUpperCase()

    const wallet = {
      deposits: sumWhere((r) => type(r) === 'DEPOSIT'),
      depositsCount: countWhere((r) => type(r) === 'DEPOSIT'),
      selfDeposits: sumWhere((r) => type(r) === 'DEPOSIT' && cat(r) === 'SELF_DEPOSIT'),
      systemAwards: sumWhere((r) => type(r) === 'DEPOSIT' && cat(r) === 'SYSTEM_AWARD'),
      salary: sumWhere((r) => type(r) === 'DEPOSIT' && cat(r) === 'SALARY'),
      loanDisbursed: sumWhere((r) => cat(r) === 'LOAN_DISBURSEMENT'),
      bonuses: sumWhere((r) => type(r) === 'BONUS'),
      bonusesCount: countWhere((r) => type(r) === 'BONUS'),
      loyalty: sumWhere((r) => type(r) === 'LOYALTY_REWARD'),
      loyaltyCount: countWhere((r) => type(r) === 'LOYALTY_REWARD'),
      withdrawals: sumWhere((r) => type(r) === 'WITHDRAWAL' && cat(r) !== 'INTERNAL_TRANSFER'),
      withdrawalsCount: countWhere((r) => type(r) === 'WITHDRAWAL' && cat(r) !== 'INTERNAL_TRANSFER'),
      instantWithdrawals: sumWhere((r) => cat(r) === 'INSTANT_WITHDRAWAL'),
      transfers: sumWhere((r) => type(r) === 'WITHDRAWAL' && cat(r) === 'INTERNAL_TRANSFER'),
      fees: sumWhere((r) => cat(r).includes('FEE')),
      overdraftInterest: sumWhere((r) => cat(r) === 'OVERDRAFT_INTEREST'),
      overdraftDraws: sumWhere((r) => cat(r) === 'OVERDRAFT_DRAW'),
      loanRecovery: sumWhere((r) => type(r) === 'LOAN_RECOVERY' || cat(r) === 'LOAN_REPAYMENT'),
      adminAdjustments: sumWhere((r) => cat(r) === 'ADMIN_ADJUSTMENT'),
    }


    // Most active users
    const counts = new Map<string, number>()
    for (const a of ACT) counts.set(a.user_id, (counts.get(a.user_id) || 0) + 1)
    let activeUsers: Array<{ name: string; actions: number }> = []
    if (counts.size) {
      const { data: emps } = await supabase
        .from('employees').select('name, auth_user_id, id')
        .or(`auth_user_id.in.(${[...counts.keys()].join(',')}),id.in.(${[...counts.keys()].join(',')})`)
      const nameOf = (uid: string) =>
        (emps || []).find((e: any) => e.auth_user_id === uid || e.id === uid)?.name || 'Unknown user'
      activeUsers = [...counts.entries()]
        .map(([uid, n]) => ({ name: nameOf(uid), actions: n }))
        .sort((a, b) => b.actions - a.actions).slice(0, 10)
    }

    const totals = {
      purchasedKg: P.reduce((s, r) => s + num(r.kilograms), 0),
      purchasedBags: P.reduce((s, r) => s + num(r.bags), 0),
      salesKg: S.reduce((s, r) => s + num(r.weight), 0),
      salesValue: S.reduce((s, r) => s + num(r.total_amount), 0),
      hulledKg: MT.reduce((s, r) => s + num(r.kgs_hulled), 0) + MJ.reduce((s, r) => s + num(r.input_weight_kg), 0),
      millingCharged: MT.reduce((s, r) => s + num(r.total_amount), 0) + MJ.reduce((s, r) => s + num(r.total_cost), 0),
      collected: MT.reduce((s, r) => s + num(r.amount_paid), 0)
        + MJ.reduce((s, r) => s + num(r.amount_paid), 0)
        + MC.reduce((s, r) => s + num(r.amount_paid), 0),
      trucks: ED.reduce((s, r) => s + num(r.trucks), 0) || DA.length,
    }

    // ─────────── PDF ───────────
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const prettyDate = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    doc.setFillColor(20, 83, 45)
    doc.rect(0, 0, W, 26, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(15); doc.setFont('helvetica', 'bold')
    doc.text('GREAT AGRO COFFEE', 14, 11)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('a member of YEDA COFFEE COMPANY LIMITED  |  P.O Box 431420, Kasese, Uganda', 14, 17)
    doc.text('Daily Operations Report', 14, 22.5)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(prettyDate, 14, 35)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text(`Generated ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })} (EAT)`, W - 14, 35, { align: 'right' })

    const table = (title: string, head: string[], rows: any[][], startY?: number) => {
      let y = startY ?? (doc as any).lastAutoTable?.finalY + 10 ?? 42
      // keep the section heading with at least its header row
      if (y > doc.internal.pageSize.getHeight() - 45) { doc.addPage(); y = 20 }
      doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text(title, 14, y)
      autoTable(doc, {
        head: [head],
        body: rows.length ? rows : [head.map((_, i) => (i === 0 ? 'No records for this day' : ''))],
        startY: y + 3,
        styles: { fontSize: 7.5, cellPadding: 1.6 },
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontSize: 7.5 },
        alternateRowStyles: { fillColor: [245, 247, 245] },
        margin: { left: 14, right: 14 },
      })
    }

    table('1. Day at a glance', ['Metric', 'Value'], [
      ['Coffee purchased', `${fmt(totals.purchasedKg)} kg (${fmt(totals.purchasedBags)} bags, ${P.length} deliveries)`],
      ['Sales made', `${S.length} sales — ${fmt(totals.salesKg)} kg`],
      ['Sales value', money(totals.salesValue)],
      ['Trucks dispatched', `${fmt(totals.trucks)}`],
      ['Quality assessments', `${Q.length}`],
      ['Kgs hulled (milling)', `${fmt(totals.hulledKg)} kg`],
      ['Milling charged', money(totals.millingCharged)],
      ['Amount collected', money(totals.collected)],
      ['Dispatch analyses (EUDR)', `${DA.length}`],
      ['Total system deposits', `${money(wallet.deposits)} (${wallet.depositsCount})`],
      ['Bonuses awarded', `${money(wallet.bonuses)} (${wallet.bonusesCount})`],
      ['Loyalty rewards awarded', `${money(wallet.loyalty)} (${wallet.loyaltyCount})`],
      ['Total withdrawals', `${money(wallet.withdrawals)} (${wallet.withdrawalsCount})`],
      ['Fees & charges collected', money(wallet.fees)],
      ['Active users', `${activeUsers.length}`],
    ], 42)

    table('2. Coffee purchased today', ['Batch', 'Supplier', 'Type', 'Kg', 'Bags', 'Status'],
      P.map((r) => [r.batch_number || '-', r.supplier_name || '-', r.coffee_type || '-', fmt(num(r.kilograms)), fmt(num(r.bags)), r.status || '-']))

    table('3. Sales made today (buyer, trucks & value)', ['Buyer / Destination', 'Type', 'Kg', 'Unit price', 'Total', 'Truck', 'Driver'],
      S.map((r) => [r.customer || '-', r.coffee_type || '-', fmt(num(r.weight)), fmt(num(r.unit_price)), money(num(r.total_amount)), r.truck_details || '-', r.driver_details || '-']))

    table('4. Quality assessments', ['Form no.', 'Batch', 'Moisture', 'G1', 'G2', 'Outturn', 'Final price', 'Status'],
      Q.map((r) => [r.form_number || '-', r.batch_number || '-', r.moisture ?? '-', r.group1_defects ?? '-', r.group2_defects ?? '-', r.outturn ?? '-', r.final_price ? fmt(num(r.final_price)) : '-', r.status || '-']))

    table('5. EUDR dispatch monitoring', ['Analysis no.', 'Truck serial', 'Vehicle', 'Buyer', 'Type', 'Bags', 'Weight (kg)', 'Verdict'],
      DA.map((r) => [r.analysis_number || '-', r.truck_serial_number || '-', r.vehicle_registration || '-', r.destination_buyer || '-', r.coffee_type || '-', fmt(num(r.bags_loaded)), fmt(num(r.total_weight_kg)), r.verdict || r.status || '-']))

    table('6. EUDR dispatch reports', ['Location', 'Buyer', 'Type', 'Trucks', 'Vehicles', 'Bags deducted', 'Status'],
      ED.map((r) => [r.dispatch_location || '-', r.destination_buyer || '-', r.coffee_type || '-', fmt(num(r.trucks)), Array.isArray(r.vehicle_registrations) ? r.vehicle_registrations.join(', ') : (r.vehicle_registrations || '-'), fmt(num(r.bags_deducted)), r.status || '-']))

    table('7. Milling report', ['Customer', 'Kgs hulled', 'Rate', 'Charged', 'Paid', 'Balance'], [
      ...MT.map((r) => [r.customer_name || '-', fmt(num(r.kgs_hulled)), fmt(num(r.rate_per_kg)), money(num(r.total_amount)), money(num(r.amount_paid)), money(num(r.balance))]),
      ...MJ.map((r) => [`${r.customer_name || '-'} (${r.job_number || 'job'})`, fmt(num(r.input_weight_kg)), '-', money(num(r.total_cost)), money(num(r.amount_paid)), money(num(r.total_cost) - num(r.amount_paid))]),
    ])

    table('8. Amount collected', ['Source', 'Amount'], [
      ['Milling transactions', money(MT.reduce((s, r) => s + num(r.amount_paid), 0))],
      ['Milling jobs', money(MJ.reduce((s, r) => s + num(r.amount_paid), 0))],
      ['Milling cash / MoMo collections', money(MC.reduce((s, r) => s + num(r.amount_paid), 0))],
      ['TOTAL COLLECTED', money(totals.collected)],
    ])

    table('9. Wallet & system money movements', ['Item', 'Amount', 'Entries'], [
      ['Total deposits into wallets', money(wallet.deposits), `${wallet.depositsCount}`],
      ['— Self deposits (top-ups)', money(wallet.selfDeposits), ''],
      ['— System awards / credits', money(wallet.systemAwards), ''],
      ['— Salary credits', money(wallet.salary), ''],
      ['— Loan disbursements', money(wallet.loanDisbursed), ''],
      ['Bonuses awarded', money(wallet.bonuses), `${wallet.bonusesCount}`],
      ['Loyalty rewards awarded', money(wallet.loyalty), `${wallet.loyaltyCount}`],
      ['Total withdrawals', money(wallet.withdrawals), `${wallet.withdrawalsCount}`],
      ['— Instant withdrawals (mobile money)', money(wallet.instantWithdrawals), ''],
      ['Wallet-to-wallet transfers', money(wallet.transfers), ''],
      ['Fees & service charges', money(wallet.fees), ''],
      ['Overdraft draws', money(wallet.overdraftDraws), ''],
      ['Overdraft interest charged', money(wallet.overdraftInterest), ''],
      ['Loan recoveries', money(wallet.loanRecovery), ''],
      ['Admin adjustments', money(wallet.adminAdjustments), ''],
      ['NET WALLET MOVEMENT (in - out)', money(wallet.deposits + wallet.bonuses + wallet.loyalty - wallet.withdrawals - wallet.fees), ''],
    ])

    table('10. Most active users today', ['#', 'User', 'Recorded actions'],
      activeUsers.map((u, i) => [`${i + 1}`, u.name, `${u.actions}`]))

    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFontSize(7); doc.setTextColor(120)
      doc.text(`Great Agro Coffee — Daily Operations Report — ${date}`, 14, doc.internal.pageSize.getHeight() - 8)
      doc.text(`Page ${i} of ${pages}`, W - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
    }

    const pdfBytes = new Uint8Array(doc.output('arraybuffer') as ArrayBuffer)
    const path = `${date.slice(0, 4)}/daily-operations-report-${date}.pdf`
    const up = await supabase.storage.from(BUCKET).upload(path, pdfBytes, {
      contentType: 'application/pdf', upsert: true,
    })
    if (up.error) throw new Error(`Storage upload failed: ${up.error.message}`)
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30)
    if (signed.error) throw new Error(`Signed URL failed: ${signed.error.message}`)
    const downloadUrl = signed.data.signedUrl

    // ─────────── Email ───────────
    const row = (l: string, v: string) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #e6e9e6;color:#475569;">${l}</td><td style="padding:8px 12px;border-bottom:1px solid #e6e9e6;text-align:right;font-weight:bold;color:#0f172a;">${v}</td></tr>`
    const html = `<!doctype html><html><body style="margin:0;background:#f4f6f4;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;">
        <div style="background:#14532d;color:#ffffff;padding:22px 24px;">
          <div style="font-size:18px;font-weight:bold;">GREAT AGRO COFFEE</div>
          <div style="font-size:12px;opacity:.85;">a member of YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:14px;margin-top:10px;">Daily Operations Report — ${prettyDate}</div>
        </div>
        <div style="padding:24px;">
          <p style="color:#334155;font-size:14px;">The automated daily operations report has been generated. The full PDF covers purchases, sales, dispatch monitoring, quality, milling, collections and user activity.</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
            ${row('Coffee purchased', `${fmt(totals.purchasedKg)} kg (${P.length} deliveries)`)}
            ${row('Sales', `${S.length} sales — ${fmt(totals.salesKg)} kg`)}
            ${row('Sales value', money(totals.salesValue))}
            ${row('Trucks dispatched', fmt(totals.trucks))}
            ${row('Quality assessments', `${Q.length}`)}
            ${row('Dispatch analyses (EUDR)', `${DA.length}`)}
            ${row('Kgs hulled', `${fmt(totals.hulledKg)} kg`)}
            ${row('Amount collected', money(totals.collected))}
            ${row('Total system deposits', `${money(wallet.deposits)} (${wallet.depositsCount} entries)`)}
            ${row('Bonuses awarded', `${money(wallet.bonuses)} (${wallet.bonusesCount})`)}
            ${row('Loyalty rewards awarded', `${money(wallet.loyalty)} (${wallet.loyaltyCount})`)}
            ${row('Total withdrawals', `${money(wallet.withdrawals)} (${wallet.withdrawalsCount})`)}
            ${row('Wallet-to-wallet transfers', money(wallet.transfers))}
            ${row('Fees &amp; charges collected', money(wallet.fees))}
            ${row('Overdraft draws / interest', `${money(wallet.overdraftDraws)} / ${money(wallet.overdraftInterest)}`)}
            ${row('Loan disbursed / recovered', `${money(wallet.loanDisbursed)} / ${money(wallet.loanRecovery)}`)}
            ${row('Most active user', activeUsers[0] ? `${activeUsers[0].name} (${activeUsers[0].actions} actions)` : 'n/a')}
          </table>
          <p style="text-align:center;margin:26px 0;">
            <a href="${downloadUrl}" style="background:#14532d;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">Download the full PDF report</a>
          </p>
          <p style="color:#64748b;font-size:11px;">This download link stays valid for 30 days. Report generated automatically at 8:00 PM (EAT).</p>
        </div>
        <div style="background:#0f172a;color:#94a3b8;padding:14px 24px;font-size:11px;">
          P.O Box 431420, Kasese, Uganda · +256 393 001 626 / +256 393 101 103 · operations@greatpearlcoffee.com
        </div>
      </div></body></html>`
    const text = `Great Agro Coffee — Daily Operations Report ${prettyDate}
Purchased: ${fmt(totals.purchasedKg)} kg | Sales: ${S.length} (${fmt(totals.salesKg)} kg, ${money(totals.salesValue)})
Trucks: ${fmt(totals.trucks)} | Quality assessments: ${Q.length} | Hulled: ${fmt(totals.hulledKg)} kg | Collected: ${money(totals.collected)}
Download the PDF: ${downloadUrl}`

    const recipients = testEmail
      ? [{ name: 'Administrator', email: testEmail, phone: null as string | null }]
      : ADMINS.map((a: any) => ({ name: a.name, email: a.email, phone: a.phone }))

    const emailResults: any[] = []
    for (const r of recipients) {
      if (!r.email) continue
      try {
        if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured')
        const idem = `daily-ops-report-${date}-${r.email}${testEmail ? '-test' : ''}`
        await sendLovableEmail({
          to: r.email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: `Daily Operations Report — ${prettyDate}`,
          html, text, reply_to: 'operations@greatpearlcoffee.com',
          purpose: 'transactional', label: 'daily-operations-report',
          idempotency_key: idem, unsubscribe_token: token(),
        }, { apiKey: lovableApiKey, idempotencyKey: idem })
        emailResults.push({ email: r.email, status: 'sent' })
      } catch (e) {
        console.error('Email failed', r.email, (e as Error).message)
        emailResults.push({ email: r.email, status: `failed: ${(e as Error).message}` })
      }
    }

    // ─────────── SMS ───────────
    const smsResults: any[] = []
    if (!skipSms) {
      const msg = `Great Agro Coffee: The Daily Operations Report for ${date} is ready for review. Purchases ${fmt(totals.purchasedKg)}kg, sales ${money(totals.salesValue)}, hulled ${fmt(totals.hulledKg)}kg, collected ${money(totals.collected)}. Full PDF sent to your email.`
      for (const r of recipients) {
        if (!r.phone) continue
        try {
          const { error } = await supabase.functions.invoke('send-sms', {
            body: { phone: r.phone, message: msg, userName: r.name, recipientEmail: r.email, messageType: 'daily_report' },
          })
          smsResults.push({ phone: r.phone, status: error ? `failed: ${error.message}` : 'sent' })
        } catch (e) {
          smsResults.push({ phone: r.phone, status: `failed: ${(e as Error).message}` })
        }
      }
    }

    console.log(`✅ Daily operations report ${date}: ${emailResults.length} emails, ${smsResults.length} SMS`)
    return json({ ok: true, date, path, downloadUrl, totals, emails: emailResults, sms: smsResults })
  } catch (error) {
    console.error('❌ daily-operations-report failed:', (error as Error).message)
    return json({ ok: false, error: (error as Error).message })
  }
})
