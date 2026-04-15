import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = "Great Agro Coffee"
const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site"
const FROM_DOMAIN = "greatpearlcoffeesystem.site"

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'

async function sendTemplateEmail(
  lovableApiKey: string, templateName: string, recipientEmail: string,
  recipientName: string, templateData: Record<string, any>, today: string
) {
  const template = TEMPLATES[templateName]
  if (!template) throw new Error(`Template ${templateName} not found`)
  const personalData = { ...templateData, recipientName }
  const html = await renderAsync(React.createElement(template.component, personalData))
  const plainText = await renderAsync(React.createElement(template.component, personalData), { plainText: true })
  const resolvedSubject = typeof template.subject === 'function' ? template.subject(personalData) : template.subject
  const idempotencyKey = `${templateName}-${today}-${recipientEmail}`
  await sendLovableEmail(
    { to: recipientEmail, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject, html, text: plainText, purpose: 'transactional', label: templateName,
      idempotency_key: idempotencyKey, unsubscribe_token: generateToken() },
    { apiKey: lovableApiKey, idempotencyKey }
  )

  // CC operations if they're not the direct recipient
  if (recipientEmail.toLowerCase() !== OPERATIONS_EMAIL.toLowerCase()) {
    try {
      const baseKey = idempotencyKey.replace(recipientEmail, '').replace(/[^a-zA-Z0-9-_]/g, '')
      const opsIdempotencyKey = `ops-cc-${templateName}-${baseKey}`
      const ccNote = `<div style="background:#f0f4f8;padding:12px 16px;border-radius:6px;margin-bottom:20px;font-family:Arial,sans-serif;font-size:13px;color:#334155;">
        <strong>📋 Operations Copy</strong><br/>
        Original recipient: <strong>${recipientEmail}</strong> (${recipientName})<br/>
        Template: ${templateName} | Sent: ${new Date().toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}
      </div>`
      const opsHtml = html.replace(/<body[^>]*>/, (match: string) => `${match}${ccNote}`)
      await sendLovableEmail(
        { to: OPERATIONS_EMAIL, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: `[CC] ${resolvedSubject}`, html: opsHtml, text: `[CC - Sent to: ${recipientEmail}]\n\n${plainText}`,
          purpose: 'transactional', label: `cc-${templateName}`,
          idempotency_key: opsIdempotencyKey, unsubscribe_token: generateToken() },
        { apiKey: lovableApiKey, idempotencyKey: opsIdempotencyKey }
      )
      console.log(`📋 Operations CC sent for ${templateName} (original: ${recipientEmail})`)
    } catch (ccErr) {
      console.warn(`⚠️ Failed to send operations CC for ${templateName}:`, ccErr.message)
    }
  }
}

async function sendToRecipients(
  lovableApiKey: string, templateName: string,
  recipients: Array<{name:string;email:string}>, templateData: Record<string, any>, today: string
) {
  const results: Array<{email:string;status:string}> = []
  for (const r of recipients) {
    try {
      await sendTemplateEmail(lovableApiKey, templateName, r.email, r.name, templateData, today)
      results.push({ email: r.email, status: 'sent' })
      console.log(`✅ ${templateName} sent to ${r.email}`)
    } catch (err) {
      results.push({ email: r.email, status: `failed: ${err.message}` })
      console.error(`❌ ${templateName} failed for ${r.email}:`, err.message)
    }
  }
  return results
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) return new Response(JSON.stringify({ error: 'Email service not configured' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  let departments = ['quality', 'admin', 'operations', 'field', 'it', 'finance', 'eudr', 'sales', 'inventory', 'procurement']
  let targetEmail: string | null = null
  let broadcastTemplate: string | null = null

  try {
    const body = await req.json()
    if (body.department) departments = [body.department]
    if (body.departments) departments = body.departments
    if (body.targetEmail) targetEmail = body.targetEmail
    if (body.broadcastTemplate) broadcastTemplate = body.broadcastTemplate
  } catch {}

  // ─── BROADCAST MODE: send a template to ALL employees ───
  if (broadcastTemplate) {
    try {
      const { data: allEmps } = await supabase
        .from('employees').select('name, email, department')
        .eq('status', 'Active')
      const recipients = (allEmps || []).map((e: any) => ({ name: e.name, email: e.email }))
      const today = new Date().toISOString().split('T')[0]
      const broadcastResults = await sendToRecipients(lovableApiKey, broadcastTemplate, recipients, {}, today)
      console.log(`✅ Broadcast ${broadcastTemplate} sent to ${recipients.length} users`)
      return new Response(JSON.stringify({ success: true, template: broadcastTemplate, sent: broadcastResults.length, results: broadcastResults }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (error) {
      console.error('❌ Broadcast failed:', error.message)
      return new Response(JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const reportDate = new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const results: Record<string, Array<{email:string;status:string}>> = {}

  try {
    // ─── Gather all data in parallel ───
    const [
      { data: pendingRecords }, { data: assessedRecords }, { data: inventoryRecords },
      { data: rejectedRecords }, { data: allNonSold },
      { data: todayPurchases }, { data: yesterdayPurchases },
      { data: todaySales }, { data: pendingApprovals },
      { data: approvedToday }, { data: rejectedApprovals },
      { data: todayWithdrawals }, { data: todayDispatches }, { data: allDispatches },
      { data: todayFieldReports }, { data: todayLogins }, { data: activeEmps },
      { data: todayPayments }, { data: pendingPaymentLots },
      { data: todayExpenses }, { data: todayAdvances },
      { data: activeContracts }, { data: allEmployees },
    ] = await Promise.all([
      supabase.from('coffee_records').select('batch_number, supplier_name, coffee_type, kilograms, date').eq('status', 'pending').order('date', { ascending: false }),
      supabase.from('quality_assessments').select('batch_number, store_record_id').eq('date_assessed', today),
      supabase.from('coffee_records').select('kilograms').eq('status', 'inventory'),
      supabase.from('coffee_records').select('id').eq('status', 'rejected'),
      supabase.from('coffee_records').select('kilograms').not('status', 'in', '("sold_out","rejected")'),
      supabase.from('coffee_records').select('supplier_name, coffee_type, kilograms, date').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('coffee_records').select('kilograms').gte('created_at', new Date(Date.now()-86400000*2).toISOString().split('T')[0]+'T00:00:00').lte('created_at', new Date(Date.now()-86400000).toISOString().split('T')[0]+'T23:59:59'),
      supabase.from('sales_transactions').select('customer, coffee_type, weight, total_amount, date').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('approval_requests').select('title, type, amount, requestedby_name').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
      supabase.from('approval_requests').select('id').eq('status', 'approved').gte('updated_at', `${today}T00:00:00`),
      supabase.from('approval_requests').select('id').eq('status', 'rejected').gte('updated_at', `${today}T00:00:00`),
      supabase.from('approval_requests').select('amount').eq('type', 'withdrawal').eq('status', 'approved').gte('updated_at', `${today}T00:00:00`),
      supabase.from('eudr_dispatch_reports').select('id, trucks, bags_deducted, dispatch_date, destination_buyer, coffee_type, dispatch_location, status').gte('created_at', `${today}T00:00:00`),
      supabase.from('eudr_dispatch_reports').select('id'),
      supabase.from('daily_reports').select('total_kgs_mobilized, villages_visited, farmers_visited').gte('created_at', `${today}T00:00:00`),
      supabase.from('employee_login_tracker').select('id').gte('created_at', `${today}T00:00:00`),
      supabase.from('employees').select('id').eq('status', 'Active'),
      supabase.from('supplier_payments').select('amount_paid_ugx, method').gte('created_at', `${today}T00:00:00`).eq('status', 'approved'),
      supabase.from('finance_coffee_lots').select('total_amount_ugx').is('finance_status', null),
      supabase.from('finance_expenses').select('amount').gte('created_at', `${today}T00:00:00`),
      supabase.from('approval_requests').select('amount').eq('type', 'salary_advance').eq('status', 'approved').gte('updated_at', `${today}T00:00:00`),
      supabase.from('buyer_contracts').select('buyer_name, contract_ref, total_quantity, allocated_quantity, status').eq('status', 'active'),
      supabase.from('employees').select('name, email, department').eq('status', 'Active'),
    ])

    // ─── Enrich assessed records from quality_assessments with coffee_records data ───
    const assessedQA = assessedRecords || []
    const assessedBatchNumbers = assessedQA.map((a:any) => a.batch_number)
    let assessed: any[] = []
    if (assessedBatchNumbers.length > 0) {
      const { data: assessedCoffee } = await supabase.from('coffee_records')
        .select('batch_number, supplier_name, coffee_type, kilograms, date')
        .in('batch_number', assessedBatchNumbers)
      assessed = assessedCoffee || []
    }

    // ─── Computed values ───
    const pending = pendingRecords || []
    const totalPendingKg = pending.reduce((s:number, r:any) => s + r.kilograms, 0)
    const totalAssessedKg = assessed.reduce((s:number, r:any) => s + r.kilograms, 0)
    const inventoryKg = (inventoryRecords||[]).reduce((s:number, r:any) => s + r.kilograms, 0)
    const availableStockKg = (allNonSold||[]).reduce((s:number, r:any) => s + r.kilograms, 0)
    const purchasesList = todayPurchases || []
    const purchasesKgToday = purchasesList.reduce((s:number, r:any) => s + r.kilograms, 0)
    const purchasesKgYesterday = (yesterdayPurchases||[]).reduce((s:number, r:any) => s + r.kilograms, 0)
    const salesList = todaySales || []
    const salesKgToday = salesList.reduce((s:number, r:any) => s + (r.weight||0), 0)
    const salesAmountToday = salesList.reduce((s:number, r:any) => s + (r.total_amount||0), 0)
    const withdrawalsAmt = (todayWithdrawals||[]).reduce((s:number, r:any) => s + (r.amount||0), 0)
    const fieldReports = todayFieldReports || []
    const kgMobilized = fieldReports.reduce((s:number, r:any) => s + (r.total_kgs_mobilized||0), 0)
    const villagesCount = fieldReports.reduce((s:number, r:any) => { const v = r.villages_visited; return s + (typeof v === 'string' ? v.split(',').length : 0) }, 0)
    const paymentsAmt = (todayPayments||[]).reduce((s:number, r:any) => s + (r.amount_paid_ugx||0), 0)
    const pendingPayAmt = (pendingPaymentLots||[]).reduce((s:number, r:any) => s + (r.total_amount_ugx||0), 0)
    const expensesAmt = (todayExpenses||[]).reduce((s:number, r:any) => s + (r.amount||0), 0)
    const advancesAmt = (todayAdvances||[]).reduce((s:number, r:any) => s + (r.amount||0), 0)
    const dispatches = todayDispatches || []
    const truckCount = dispatches.reduce((s:number, d:any) => s + ((d.trucks as any[])?.length || 0), 0)
    const bagsDeducted = dispatches.reduce((s:number, d:any) => s + (d.bags_deducted||0), 0)
    const contracts = activeContracts || []
    const totalContractedKg = contracts.reduce((s:number, c:any) => s + (c.total_quantity||0), 0)
    const fulfilledKg = contracts.reduce((s:number, c:any) => s + (c.allocated_quantity||0), 0)

    const getRecipients = (deptFilters: string[]) => {
      if (targetEmail) return [{ name: 'Team', email: targetEmail }]
      return (allEmployees||[]).filter((e:any) => deptFilters.some(d => e.department?.toLowerCase().includes(d.toLowerCase())))
    }

    // ─── QUALITY ───
    if (departments.includes('quality')) {
      const r = getRecipients(['Quality Control', 'Administration'])
      results['quality'] = await sendToRecipients(lovableApiKey, 'daily-quality-summary', r, {
        reportDate, totalPending: pending.length, totalAssessedToday: assessed.length, totalPendingKg, totalAssessedKg,
        pendingBatches: pending.slice(0,50).map((r:any) => ({ batch_number: r.batch_number, supplier_name: r.supplier_name, coffee_type: r.coffee_type, kilograms: r.kilograms, date: r.date })),
        assessedBatches: assessed.slice(0,50).map((r:any) => ({ batch_number: r.batch_number, supplier_name: r.supplier_name, coffee_type: r.coffee_type, kilograms: r.kilograms, date: r.date })),
      }, today)
    }

    // ─── ADMIN ───
    if (departments.includes('admin')) {
      const r = getRecipients(['Administration'])
      results['admin'] = await sendToRecipients(lovableApiKey, 'daily-admin-summary', r, {
        reportDate, availableStockKg, inventoryBatches: (inventoryRecords||[]).length, inventoryKg,
        pendingAssessment: pending.length, pendingAssessmentKg: totalPendingKg, assessedBatches: assessed.length, rejectedLots: (rejectedRecords||[]).length,
        purchasesToday: purchasesList.length, purchasesKgToday, purchasesYesterday: (yesterdayPurchases||[]).length, purchasesKgYesterday,
        salesToday: salesList.length, salesAmountToday, salesKgToday,
        pendingApprovals: (pendingApprovals||[]).length, approvedToday: (approvedToday||[]).length, rejectedApprovalToday: (rejectedApprovals||[]).length,
        withdrawalsToday: (todayWithdrawals||[]).length, withdrawalsAmountToday: withdrawalsAmt,
        dispatchesToday: dispatches.length, totalDispatchedKg: 0,
        fieldReportsToday: fieldReports.length, totalKgMobilized: kgMobilized, villagesVisited: villagesCount,
        topPendingApprovals: (pendingApprovals||[]).slice(0,5).map((a:any) => ({ title: a.title, type: a.type, amount: a.amount, requestedBy: a.requestedby_name||'Unknown' })),
        recentSales: salesList.slice(0,5).map((s:any) => ({ customer: s.customer, coffeeType: s.coffee_type, weight: s.weight||0, amount: s.total_amount||0 })),
        recentPurchases: purchasesList.slice(0,8).map((p:any) => ({ supplier: p.supplier_name, coffeeType: p.coffee_type, kg: p.kilograms, date: p.date })),
      }, today)
    }

    // ─── OPERATIONS ───
    if (departments.includes('operations')) {
      const r = getRecipients(['Operations'])
      results['operations'] = await sendToRecipients(lovableApiKey, 'daily-ops-summary', r, {
        reportDate, department: 'Operations',
        inventoryBatches: (inventoryRecords||[]).length, inventoryKg,
        pendingAssessment: pending.length, pendingAssessmentKg: totalPendingKg,
        purchasesToday: purchasesList.length, purchasesKg: purchasesKgToday,
        dispatchesToday: dispatches.length, dispatchedKg: 0,
        salesToday: salesList.length, salesKg: salesKgToday,
        highlights: [`${purchasesList.length} purchases (${purchasesKgToday.toLocaleString()} kg)`, `${pending.length} batches pending QC`, `${(inventoryRecords||[]).length} batches in store`],
        actionItems: pending.length > 20 ? [`${pending.length} batches pending — coordinate with Quality`] : [],
      }, today)
    }

    // ─── FIELD ───
    if (departments.includes('field')) {
      const r = getRecipients(['Field'])
      results['field'] = await sendToRecipients(lovableApiKey, 'daily-ops-summary', r, {
        reportDate, department: 'Field Operations',
        fieldReportsToday: fieldReports.length, kgMobilized, villagesVisited: villagesCount,
        highlights: [`${fieldReports.length} field reports submitted`, `${kgMobilized.toLocaleString()} kg mobilized`],
        actionItems: fieldReports.length === 0 ? ['No field reports submitted today — please file daily'] : [],
      }, today)
    }

    // ─── IT ───
    if (departments.includes('it')) {
      const r = getRecipients(['IT'])
      results['it'] = await sendToRecipients(lovableApiKey, 'daily-ops-summary', r, {
        reportDate, department: 'IT Department',
        activeEmployees: (activeEmps||[]).length, loginsToday: (todayLogins||[]).length, pendingIssues: 0,
        highlights: [`${(todayLogins||[]).length} system logins today`, `${(activeEmps||[]).length} active employees`],
      }, today)
    }

    // ─── FINANCE ───
    if (departments.includes('finance')) {
      const r = getRecipients(['Finance'])
      results['finance'] = await sendToRecipients(lovableApiKey, 'daily-finance-summary', r, {
        reportDate,
        salesToday: salesList.length, salesRevenueToday: salesAmountToday, salesKgToday,
        paymentsMadeToday: (todayPayments||[]).length, paymentsAmountToday: paymentsAmt,
        pendingPayments: (pendingPaymentLots||[]).length, pendingPaymentsAmount: pendingPayAmt,
        expensesToday: (todayExpenses||[]).length, expensesAmountToday: expensesAmt,
        pendingFinanceApprovals: (pendingApprovals||[]).filter((a:any) => ['salary_advance','withdrawal','money_request','lunch'].includes(a.type)).length,
        approvedToday: (approvedToday||[]).length, rejectedToday: (rejectedApprovals||[]).length,
        withdrawalsToday: (todayWithdrawals||[]).length, withdrawalsAmount: withdrawalsAmt,
        advancesToday: (todayAdvances||[]).length, advancesAmount: advancesAmt,
        totalSupplierOwed: pendingPayAmt,
        cashInToday: salesAmountToday, cashOutToday: paymentsAmt + expensesAmt + withdrawalsAmt + advancesAmt,
        pendingApprovalsList: (pendingApprovals||[]).filter((a:any) => ['salary_advance','withdrawal','money_request','lunch'].includes(a.type)).slice(0,8).map((a:any) => ({ title: a.title, type: a.type, amount: a.amount, by: a.requestedby_name||'Unknown' })),
      }, today)
    }

    // ─── EUDR ───
    if (departments.includes('eudr')) {
      const r = getRecipients(['EUDR'])
      const pendingDispatches = dispatches.filter((d:any) => d.status === 'pending' || d.status === 'draft').length
      results['eudr'] = await sendToRecipients(lovableApiKey, 'daily-eudr-summary', r, {
        reportDate,
        dispatchesToday: dispatches.length, truckCount, bagsDeducted,
        pendingDispatches, totalDispatches: (allDispatches||[]).length,
        recentDispatches: dispatches.slice(0,10).map((d:any) => ({
          date: d.dispatch_date || today, buyer: d.destination_buyer || 'N/A',
          coffeeType: d.coffee_type || 'N/A', location: d.dispatch_location || 'N/A', status: d.status || 'N/A',
        })),
        highlights: [`${dispatches.length} dispatch reports created today`, truckCount > 0 ? `${truckCount} trucks dispatched` : null].filter(Boolean),
        actionItems: pendingDispatches > 0 ? [`${pendingDispatches} dispatch reports still pending completion`] : [],
      }, today)
    }

    // ─── SALES ───
    if (departments.includes('sales')) {
      const r = getRecipients(['Sales'])
      const nearExpiry = contracts.filter((c:any) => {
        // Consider near expiry if delivery_period_end is within 30 days
        return c.status === 'active'
      })
      results['sales'] = await sendToRecipients(lovableApiKey, 'daily-sales-summary', r, {
        reportDate,
        salesToday: salesList.length, salesRevenueToday: salesAmountToday, salesKgToday,
        activeContracts: contracts.length, contractsNearExpiry: 0,
        totalContractedKg, fulfilledKg, remainingKg: totalContractedKg - fulfilledKg,
        recentSales: salesList.slice(0,8).map((s:any) => ({ customer: s.customer, coffeeType: s.coffee_type, weight: s.weight||0, amount: s.total_amount||0, date: s.date || today })),
        contractSummary: contracts.slice(0,8).map((c:any) => ({
          buyer: c.buyer_name, contractRef: c.contract_ref, totalKg: c.total_quantity,
          allocatedKg: c.allocated_quantity, remaining: c.total_quantity - c.allocated_quantity, status: c.status,
        })),
        highlights: [`${salesList.length} sales made today (${salesKgToday.toLocaleString()} kg)`, `${contracts.length} active buyer contracts`],
          actionItems: contracts.filter((c:any) => (c.total_quantity - c.allocated_quantity) < c.total_quantity * 0.1 && c.total_quantity - c.allocated_quantity > 0).length > 0
          ? ['Some contracts are nearly fulfilled — review allocation'] : [],
      }, today)
    }

    // ─── INVENTORY (to all admins) ───
    if (departments.includes('inventory')) {
      // Get today's purchases with payment info for avg price
      const { data: todayRecords } = await supabase
        .from('coffee_records')
        .select('batch_number, coffee_type, kilograms, supplier_name, supplier_id, date')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)

      const records = todayRecords || []
      const totalKg = records.reduce((s: number, r: any) => s + (r.kilograms || 0), 0)

      // Get payments for price calculation
      const supplierIds = [...new Set(records.filter((r: any) => r.supplier_id).map((r: any) => r.supplier_id))]
      let paymentMap: Record<string, number> = {}
      if (supplierIds.length > 0) {
        const { data: payments } = await supabase
          .from('supplier_payments')
          .select('supplier_id, gross_payable_ugx, amount_paid_ugx')
          .in('supplier_id', supplierIds)
          .gte('created_at', `${today}T00:00:00`)
        for (const p of payments || []) {
          if (!paymentMap[p.supplier_id]) paymentMap[p.supplier_id] = 0
          paymentMap[p.supplier_id] += Number(p.amount_paid_ugx || p.gross_payable_ugx || 0)
        }
      }

      // Group by batch
      const batchMap: Record<string, { coffee_type: string; kg: number; suppliers: Set<string>; totalPaid: number }> = {}
      for (const r of records) {
        const key = r.batch_number
        if (!batchMap[key]) batchMap[key] = { coffee_type: r.coffee_type, kg: 0, suppliers: new Set(), totalPaid: 0 }
        batchMap[key].kg += r.kilograms || 0
        batchMap[key].suppliers.add(r.supplier_name)
        if (r.supplier_id && paymentMap[r.supplier_id]) {
          batchMap[key].totalPaid += paymentMap[r.supplier_id]
        }
      }

      const entries = Object.entries(batchMap).map(([batch, data]) => ({
        batch_number: batch,
        coffee_type: data.coffee_type,
        kilograms: data.kg,
        avg_price: data.kg > 0 && data.totalPaid > 0 ? Math.round(data.totalPaid / data.kg) : 0,
        suppliers: [...data.suppliers].join(', '),
      }))

      const totalPaid = Object.values(batchMap).reduce((s, b) => s + b.totalPaid, 0)
      const avgPrice = totalKg > 0 && totalPaid > 0 ? Math.round(totalPaid / totalKg) : 0

      // Send to all admins
      const adminRecipients = targetEmail
        ? [{ name: 'Admin', email: targetEmail }]
        : (allEmployees || []).filter((e: any) =>
            ['Administrator', 'Super Admin', 'Manager'].some(r => e.department?.toLowerCase().includes('admin') || e.department?.toLowerCase().includes('management'))
          )
      
      // Fallback: if no admin-department employees found, send to known admins
      const finalRecipients = adminRecipients.length > 0 ? adminRecipients : [
        { name: 'Fauza Kusa', email: 'fauzakusa@greatpearlcoffee.com' },
        { name: 'Bwambale Denis', email: 'bwambaledenis@greatpearlcoffee.com' },
        { name: 'Musema Wyclif', email: 'musemawyclif@greatpearlcoffee.com' },
        { name: 'Operations', email: 'operations@greatpearlcoffee.com' },
      ]

      results['inventory'] = await sendToRecipients(lovableApiKey, 'daily-inventory-summary', finalRecipients, {
        reportDate, totalKg, totalBatches: Object.keys(batchMap).length, avgPricePerKg: avgPrice,
        entries: entries.slice(0, 20),
      }, today)
    }

    // ─── PROCUREMENT ───
    if (departments.includes('procurement')) {
      // Buyer contracts
      const { data: buyerContracts } = await supabase
        .from('buyer_contracts')
        .select('buyer_name, contract_ref, total_quantity, allocated_quantity, status, delivery_period_end')
        .eq('status', 'active')

      const bc = buyerContracts || []
      const bcTotalKg = bc.reduce((s:number, c:any) => s + (c.total_quantity||0), 0)
      const bcFulfilledKg = bc.reduce((s:number, c:any) => s + (c.allocated_quantity||0), 0)
      const bcRemainingKg = bcTotalKg - bcFulfilledKg

      const nearExpiry = bc.filter((c:any) => {
        if (!c.delivery_period_end) return false
        const end = new Date(c.delivery_period_end)
        return end.getTime() - Date.now() < 30 * 86400000 && end.getTime() > Date.now()
      }).map((c:any) => ({
        buyer: c.buyer_name, ref: c.contract_ref,
        endDate: new Date(c.delivery_period_end).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }),
        remaining: (c.total_quantity||0) - (c.allocated_quantity||0),
      }))

      // Low fulfillment contracts
      const lowFulfillment = bc.filter((c:any) => {
        const rem = (c.total_quantity||0) - (c.allocated_quantity||0)
        return rem > 0 && rem < (c.total_quantity||0) * 0.2
      }).map((c:any) => ({
        buyer: c.buyer_name, ref: c.contract_ref,
        endDate: c.delivery_period_end ? new Date(c.delivery_period_end).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
        remaining: (c.total_quantity||0) - (c.allocated_quantity||0),
      }))

      const contractAlerts = [...nearExpiry, ...lowFulfillment.filter(lf => !nearExpiry.some(ne => ne.ref === lf.ref))]

      // Coffee Bookings
      const { data: bookingsActive } = await supabase
        .from('coffee_bookings')
        .select('supplier_name, booked_quantity_kg, delivered_quantity_kg, expiry_date, status')
        .in('status', ['active', 'partial'])

      const { data: bookingsOverdueData } = await supabase
        .from('coffee_bookings')
        .select('supplier_name, booked_quantity_kg, delivered_quantity_kg, expiry_date')
        .in('status', ['expired', 'active'])
        .lt('expiry_date', today)

      const activeBookingsCount = (bookingsActive || []).length
      const overdueBookingsList = (bookingsOverdueData || []).filter((b:any) => new Date(b.expiry_date) < new Date())
        .map((b:any) => ({
          supplier: b.supplier_name,
          bookedKg: b.booked_quantity_kg || 0,
          deliveredKg: b.delivered_quantity_kg || 0,
          expiryDate: new Date(b.expiry_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }),
        }))

      // Supplier Advances
      const { data: advances } = await supabase
        .from('supplier_advances')
        .select('supplier_id, amount_ugx, outstanding_ugx, is_closed')
        .eq('is_closed', false)

      const openAdv = advances || []
      const totalOutstanding = openAdv.reduce((s:number, a:any) => s + (a.outstanding_ugx||0), 0)

      // Get supplier names for advances
      const advSupplierIds = [...new Set(openAdv.map((a:any) => a.supplier_id).filter(Boolean))]
      let advSupplierNames: Record<string, string> = {}
      if (advSupplierIds.length > 0) {
        const { data: sups } = await supabase.from('suppliers').select('id, name').in('id', advSupplierIds)
        for (const s of sups || []) advSupplierNames[s.id] = s.name
      }
      const advancesDetail = openAdv.slice(0, 10).map((a:any) => ({
        supplier: advSupplierNames[a.supplier_id] || 'Unknown',
        amount: a.amount_ugx || 0,
        outstanding: a.outstanding_ugx || 0,
      }))

      // Inactive Suppliers (no delivery in 21 days / 3 weeks)
      const threeWeeksAgo = new Date(Date.now() - 21 * 86400000).toISOString().split('T')[0]
      const { data: allSuppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('status', 'active')

      const { data: recentDeliveries } = await supabase
        .from('coffee_records')
        .select('supplier_name, date')
        .gte('date', threeWeeksAgo)

      const recentSupplierSet = new Set((recentDeliveries||[]).map((r:any) => r.supplier_name?.toLowerCase()))
      
      // Get last delivery dates for inactive
      const { data: lastDeliveries } = await supabase
        .from('coffee_records')
        .select('supplier_name, date')
        .order('date', { ascending: false })

      const lastDeliveryMap: Record<string, string> = {}
      for (const r of lastDeliveries || []) {
        const name = r.supplier_name?.toLowerCase()
        if (name && !lastDeliveryMap[name]) lastDeliveryMap[name] = r.date
      }

      const inactive = (allSuppliers || [])
        .filter((s:any) => !recentSupplierSet.has(s.name?.toLowerCase()) && lastDeliveryMap[s.name?.toLowerCase()])
        .map((s:any) => {
          const lastDate = lastDeliveryMap[s.name?.toLowerCase()]
          return {
            name: s.name,
            lastDelivery: lastDate ? new Date(lastDate).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never',
            daysSince: lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : 999,
          }
        })
        .sort((a:any, b:any) => b.daysSince - a.daysSince)

      // Build action items
      const procActionItems: string[] = []
      if (inactive.length > 0) procActionItems.push(`${inactive.length} suppliers inactive for 3+ weeks — investigate reasons`)
      if (overdueBookingsList.length > 0) procActionItems.push(`${overdueBookingsList.length} overdue coffee booking${overdueBookingsList.length > 1 ? 's' : ''} — follow up with suppliers`)
      if (contractAlerts.length > 0) procActionItems.push(`${contractAlerts.length} buyer contract${contractAlerts.length > 1 ? 's' : ''} need attention (expiry/low fulfillment)`)
      if (totalOutstanding > 0) procActionItems.push(`UGX ${totalOutstanding.toLocaleString()} in outstanding supplier advances`)

      const procHighlights: string[] = []
      procHighlights.push(`${bc.length} active buyer contracts (${bcRemainingKg.toLocaleString()} kg remaining)`)
      if (activeBookingsCount > 0) procHighlights.push(`${activeBookingsCount} active coffee bookings`)

      // Send to Procurement staff + Timothy specifically
      const procRecipients = targetEmail
        ? [{ name: 'Team', email: targetEmail }]
        : [
            ...(allEmployees||[]).filter((e:any) => e.department?.toLowerCase().includes('procurement')),
            // Always include Timothy
            ...((allEmployees||[]).filter((e:any) => e.email === 'tatwanzire@greatpearlcoffee.com' && !e.department?.toLowerCase().includes('procurement'))),
            // CC operations
            { name: 'Operations', email: 'operations@greatpearlcoffee.com' },
          ]

      results['procurement'] = await sendToRecipients(lovableApiKey, 'daily-procurement-summary', procRecipients, {
        reportDate,
        activeBuyerContracts: bc.length, totalContractedKg: bcTotalKg, fulfilledKg: bcFulfilledKg, remainingKg: bcRemainingKg,
        nearExpiryContracts: contractAlerts.slice(0, 5),
        activeBookings: activeBookingsCount, bookingsOverdue: overdueBookingsList.length,
        overdueBookings: overdueBookingsList.slice(0, 5),
        openAdvances: openAdv.length, totalOutstandingAdvances: totalOutstanding,
        advancesDetail,
        inactiveSuppliers: inactive.slice(0, 15), inactiveCount: inactive.length,
        highlights: procHighlights, actionItems: procActionItems,
      }, today)
    }

    console.log('✅ All department summaries sent', JSON.stringify(results))
    return new Response(JSON.stringify({ success: true, date: today, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('❌ Daily department summary failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
