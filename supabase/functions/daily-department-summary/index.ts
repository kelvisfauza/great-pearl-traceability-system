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

async function sendTemplateEmail(
  lovableApiKey: string,
  templateName: string,
  recipientEmail: string,
  recipientName: string,
  templateData: Record<string, any>,
  today: string
) {
  const template = TEMPLATES[templateName]
  if (!template) throw new Error(`Template ${templateName} not found`)

  const personalData = { ...templateData, recipientName }
  const html = await renderAsync(React.createElement(template.component, personalData))
  const plainText = await renderAsync(React.createElement(template.component, personalData), { plainText: true })
  const resolvedSubject = typeof template.subject === 'function' ? template.subject(personalData) : template.subject
  const idempotencyKey = `${templateName}-${today}-${recipientEmail}`

  await sendLovableEmail(
    {
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: generateToken(),
    },
    { apiKey: lovableApiKey, idempotencyKey }
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  let departments = ['quality', 'admin', 'operations', 'field', 'it']
  let targetEmail: string | null = null

  try {
    const body = await req.json()
    if (body.department) departments = [body.department]
    if (body.departments) departments = body.departments
    if (body.targetEmail) targetEmail = body.targetEmail
  } catch { /* use defaults */ }

  const today = new Date().toISOString().split('T')[0]
  const reportDate = new Date().toLocaleDateString('en-UG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const results: Record<string, Array<{ email: string; status: string }>> = {}

  try {
    // ─── Gather shared data ───
    const [
      { data: pendingRecords },
      { data: assessedRecords },
      { data: inventoryRecords },
      { data: rejectedRecords },
      { data: allNonSold },
      { data: todayPurchases },
      { data: yesterdayPurchases },
      { data: todaySales },
      { data: pendingApprovals },
      { data: approvedToday },
      { data: rejectedApprovals },
      { data: todayWithdrawals },
      { data: todayDispatches },
      { data: todayFieldReports },
      { data: todayLogins },
      { data: activeEmployees },
    ] = await Promise.all([
      supabase.from('coffee_records').select('batch_number, supplier_name, coffee_type, kilograms, date').eq('status', 'pending').order('date', { ascending: false }),
      supabase.from('coffee_records').select('batch_number, supplier_name, coffee_type, kilograms, date').eq('status', 'assessed').gte('updated_at', `${today}T00:00:00`).lte('updated_at', `${today}T23:59:59`),
      supabase.from('coffee_records').select('kilograms').eq('status', 'inventory'),
      supabase.from('coffee_records').select('id').eq('status', 'rejected'),
      supabase.from('coffee_records').select('kilograms').not('status', 'in', '("sold_out","rejected")'),
      supabase.from('coffee_records').select('supplier_name, coffee_type, kilograms, date').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('coffee_records').select('kilograms').gte('created_at', new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] + 'T00:00:00').lte('created_at', new Date(Date.now() - 86400000).toISOString().split('T')[0] + 'T23:59:59'),
      supabase.from('sales_transactions').select('customer, coffee_type, weight, total_amount').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('approval_requests').select('title, type, amount, requestedby_name').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
      supabase.from('approval_requests').select('id').eq('status', 'approved').gte('updated_at', `${today}T00:00:00`),
      supabase.from('approval_requests').select('id').eq('status', 'rejected').gte('updated_at', `${today}T00:00:00`),
      supabase.from('approval_requests').select('amount').eq('type', 'withdrawal').eq('status', 'approved').gte('updated_at', `${today}T00:00:00`),
      supabase.from('eudr_dispatch_reports').select('id, trucks').gte('created_at', `${today}T00:00:00`),
      supabase.from('daily_reports').select('total_kgs_mobilized, villages_visited, farmers_visited').gte('created_at', `${today}T00:00:00`),
      supabase.from('employee_login_tracker').select('id').gte('created_at', `${today}T00:00:00`),
      supabase.from('employees').select('id').eq('status', 'Active'),
    ])

    // Computed values
    const pending = pendingRecords || []
    const assessed = assessedRecords || []
    const totalPendingKg = pending.reduce((s: number, r: any) => s + r.kilograms, 0)
    const totalAssessedKg = assessed.reduce((s: number, r: any) => s + r.kilograms, 0)
    const inventoryKg = (inventoryRecords || []).reduce((s: number, r: any) => s + r.kilograms, 0)
    const availableStockKg = (allNonSold || []).reduce((s: number, r: any) => s + r.kilograms, 0)
    const purchasesTodayList = todayPurchases || []
    const purchasesKgToday = purchasesTodayList.reduce((s: number, r: any) => s + r.kilograms, 0)
    const purchasesKgYesterday = (yesterdayPurchases || []).reduce((s: number, r: any) => s + r.kilograms, 0)
    const salesList = todaySales || []
    const salesKgToday = salesList.reduce((s: number, r: any) => s + (r.weight || 0), 0)
    const salesAmountToday = salesList.reduce((s: number, r: any) => s + (r.total_amount || 0), 0)
    const withdrawalsAmountToday = (todayWithdrawals || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
    const fieldReports = todayFieldReports || []
    const kgMobilized = fieldReports.reduce((s: number, r: any) => s + (r.total_kgs_mobilized || 0), 0)
    const villagesCount = fieldReports.reduce((s: number, r: any) => {
      const v = r.villages_visited
      return s + (typeof v === 'string' ? v.split(',').length : 0)
    }, 0)

    // ─── Get employees by department ───
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('name, email, department')
      .eq('status', 'Active')

    const getRecipients = (deptFilter: string[]): Array<{ name: string; email: string }> => {
      if (targetEmail) return [{ name: 'Team', email: targetEmail }]
      return (allEmployees || []).filter((e: any) =>
        deptFilter.some(d => e.department?.toLowerCase().includes(d.toLowerCase()))
      )
    }

    // ─── QUALITY DEPARTMENT ───
    if (departments.includes('quality')) {
      const recipients = getRecipients(['Quality Control', 'Administration'])
      const qualityData = {
        reportDate,
        totalPending: pending.length,
        totalAssessedToday: assessed.length,
        totalPendingKg,
        totalAssessedKg,
        pendingBatches: pending.slice(0, 50).map((r: any) => ({
          batch_number: r.batch_number, supplier_name: r.supplier_name,
          coffee_type: r.coffee_type, kilograms: r.kilograms, date: r.date,
        })),
        assessedBatches: assessed.slice(0, 50).map((r: any) => ({
          batch_number: r.batch_number, supplier_name: r.supplier_name,
          coffee_type: r.coffee_type, kilograms: r.kilograms, date: r.date,
        })),
      }
      results['quality'] = []
      for (const r of recipients) {
        try {
          await sendTemplateEmail(lovableApiKey, 'daily-quality-summary', r.email, r.name, qualityData, today)
          results['quality'].push({ email: r.email, status: 'sent' })
        } catch (err) {
          results['quality'].push({ email: r.email, status: `failed: ${err.message}` })
        }
      }
    }

    // ─── ADMIN DEPARTMENT ───
    if (departments.includes('admin')) {
      const recipients = getRecipients(['Administration'])
      const adminData = {
        reportDate,
        availableStockKg, inventoryBatches: (inventoryRecords || []).length, inventoryKg,
        pendingAssessment: pending.length, pendingAssessmentKg: totalPendingKg,
        assessedBatches: assessed.length, rejectedLots: (rejectedRecords || []).length,
        purchasesToday: purchasesTodayList.length, purchasesKgToday,
        purchasesYesterday: (yesterdayPurchases || []).length, purchasesKgYesterday,
        salesToday: salesList.length, salesAmountToday, salesKgToday,
        pendingApprovals: (pendingApprovals || []).length,
        approvedToday: (approvedToday || []).length,
        rejectedApprovalToday: (rejectedApprovals || []).length,
        withdrawalsToday: (todayWithdrawals || []).length, withdrawalsAmountToday,
        dispatchesToday: (todayDispatches || []).length,
        totalDispatchedKg: 0, // Would need truck weight data
        fieldReportsToday: fieldReports.length,
        totalKgMobilized: kgMobilized, villagesVisited: villagesCount,
        topPendingApprovals: (pendingApprovals || []).slice(0, 5).map((a: any) => ({
          title: a.title, type: a.type, amount: a.amount, requestedBy: a.requestedby_name || 'Unknown',
        })),
        recentSales: salesList.slice(0, 5).map((s: any) => ({
          customer: s.customer, coffeeType: s.coffee_type,
          weight: s.weight || 0, amount: s.total_amount || 0,
        })),
        recentPurchases: purchasesTodayList.slice(0, 8).map((p: any) => ({
          supplier: p.supplier_name, coffeeType: p.coffee_type, kg: p.kilograms, date: p.date,
        })),
      }
      results['admin'] = []
      for (const r of recipients) {
        try {
          await sendTemplateEmail(lovableApiKey, 'daily-admin-summary', r.email, r.name, adminData, today)
          results['admin'].push({ email: r.email, status: 'sent' })
        } catch (err) {
          results['admin'].push({ email: r.email, status: `failed: ${err.message}` })
        }
      }
    }

    // ─── OPERATIONS ───
    if (departments.includes('operations')) {
      const recipients = getRecipients(['Operations'])
      const opsData = {
        reportDate, department: 'Operations',
        inventoryBatches: (inventoryRecords || []).length, inventoryKg,
        pendingAssessment: pending.length, pendingAssessmentKg: totalPendingKg,
        purchasesToday: purchasesTodayList.length, purchasesKg: purchasesKgToday,
        dispatchesToday: (todayDispatches || []).length, dispatchedKg: 0,
        salesToday: salesList.length, salesKg: salesKgToday,
        highlights: [
          `${purchasesTodayList.length} coffee purchases received today (${purchasesKgToday.toLocaleString()} kg)`,
          `${pending.length} batches pending quality assessment`,
          `${(inventoryRecords || []).length} batches currently in store`,
        ],
        actionItems: pending.length > 20
          ? [`${pending.length} batches are pending assessment — coordinate with Quality`]
          : [],
      }
      results['operations'] = []
      for (const r of recipients) {
        try {
          await sendTemplateEmail(lovableApiKey, 'daily-ops-summary', r.email, r.name, opsData, today)
          results['operations'].push({ email: r.email, status: 'sent' })
        } catch (err) {
          results['operations'].push({ email: r.email, status: `failed: ${err.message}` })
        }
      }
    }

    // ─── FIELD ───
    if (departments.includes('field')) {
      const recipients = getRecipients(['Field'])
      const fieldData = {
        reportDate, department: 'Field Operations',
        fieldReportsToday: fieldReports.length,
        kgMobilized, villagesVisited: villagesCount,
        highlights: [
          `${fieldReports.length} field reports submitted today`,
          `${kgMobilized.toLocaleString()} kg mobilized from farmers`,
        ],
        actionItems: fieldReports.length === 0
          ? ['No field reports were submitted today — please ensure reports are filed daily']
          : [],
      }
      results['field'] = []
      for (const r of recipients) {
        try {
          await sendTemplateEmail(lovableApiKey, 'daily-ops-summary', r.email, r.name, fieldData, today)
          results['field'].push({ email: r.email, status: 'sent' })
        } catch (err) {
          results['field'].push({ email: r.email, status: `failed: ${err.message}` })
        }
      }
    }

    // ─── IT ───
    if (departments.includes('it')) {
      const recipients = getRecipients(['IT'])
      const itData = {
        reportDate, department: 'IT Department',
        activeEmployees: (activeEmployees || []).length,
        loginsToday: (todayLogins || []).length,
        pendingIssues: 0,
        highlights: [
          `${(todayLogins || []).length} system logins recorded today`,
          `${(activeEmployees || []).length} active employees in the system`,
        ],
      }
      results['it'] = []
      for (const r of recipients) {
        try {
          await sendTemplateEmail(lovableApiKey, 'daily-ops-summary', r.email, r.name, itData, today)
          results['it'].push({ email: r.email, status: 'sent' })
        } catch (err) {
          results['it'].push({ email: r.email, status: `failed: ${err.message}` })
        }
      }
    }

    console.log('✅ Daily department summaries sent', JSON.stringify(results))

    return new Response(
      JSON.stringify({ success: true, date: today, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Daily department summary failed:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
