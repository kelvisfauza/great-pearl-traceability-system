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

  let targetDepartment = 'quality'
  let targetEmail: string | null = null

  try {
    const body = await req.json()
    if (body.department) targetDepartment = body.department
    if (body.targetEmail) targetEmail = body.targetEmail
  } catch { /* use defaults */ }

  const today = new Date().toISOString().split('T')[0]
  const reportDate = new Date().toLocaleDateString('en-UG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  try {
    if (targetDepartment === 'quality') {
      // Get all pending coffee records
      const { data: pendingRecords } = await supabase
        .from('coffee_records')
        .select('batch_number, supplier_name, coffee_type, kilograms, date')
        .eq('status', 'pending')
        .order('date', { ascending: false })

      // Get assessed today
      const { data: assessedRecords } = await supabase
        .from('coffee_records')
        .select('batch_number, supplier_name, coffee_type, kilograms, date')
        .eq('status', 'assessed')
        .gte('updated_at', `${today}T00:00:00`)
        .lte('updated_at', `${today}T23:59:59`)
        .order('date', { ascending: false })

      const pendingBatches = (pendingRecords || []).map(r => ({
        batch_number: r.batch_number,
        supplier_name: r.supplier_name,
        coffee_type: r.coffee_type,
        kilograms: r.kilograms,
        date: r.date,
      }))

      const assessedBatches = (assessedRecords || []).map(r => ({
        batch_number: r.batch_number,
        supplier_name: r.supplier_name,
        coffee_type: r.coffee_type,
        kilograms: r.kilograms,
        date: r.date,
      }))

      const totalPendingKg = pendingBatches.reduce((s, b) => s + b.kilograms, 0)
      const totalAssessedKg = assessedBatches.reduce((s, b) => s + b.kilograms, 0)

      const templateData = {
        reportDate,
        totalPending: pendingBatches.length,
        totalAssessedToday: assessedBatches.length,
        totalPendingKg,
        totalAssessedKg,
        pendingBatches: pendingBatches.slice(0, 50), // limit for email size
        assessedBatches: assessedBatches.slice(0, 50),
      }

      // Get quality department members + admins
      let recipients: { name: string; email: string }[] = []

      if (targetEmail) {
        // Single target for testing
        recipients = [{ name: 'Team', email: targetEmail }]
      } else {
        const { data: employees } = await supabase
          .from('employees')
          .select('name, email, department')
          .eq('status', 'Active')
          .or('department.ilike.%quality%,department.ilike.%admin%')

        recipients = (employees || []).map(e => ({ name: e.name, email: e.email }))
      }

      const template = TEMPLATES['daily-quality-summary']
      if (!template) {
        return new Response(JSON.stringify({ error: 'Template not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const results: { email: string; status: string }[] = []

      for (const recipient of recipients) {
        try {
          const personalData = { ...templateData, recipientName: recipient.name }

          const html = await renderAsync(
            React.createElement(template.component, personalData)
          )
          const plainText = await renderAsync(
            React.createElement(template.component, personalData),
            { plainText: true }
          )

          const resolvedSubject = typeof template.subject === 'function'
            ? template.subject(personalData)
            : template.subject

          const idempotencyKey = `quality-summary-${today}-${recipient.email}`

          await sendLovableEmail(
            {
              to: recipient.email,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: resolvedSubject,
              html,
              text: plainText,
              purpose: 'transactional',
              label: 'daily-quality-summary',
              idempotency_key: idempotencyKey,
              unsubscribe_token: generateToken(),
            },
            {
              apiKey: lovableApiKey,
              idempotencyKey,
            }
          )

          results.push({ email: recipient.email, status: 'sent' })
          console.log(`✅ Quality summary sent to ${recipient.email}`)
        } catch (err) {
          results.push({ email: recipient.email, status: `failed: ${err.message}` })
          console.error(`❌ Failed for ${recipient.email}:`, err.message)
        }
      }

      return new Response(
        JSON.stringify({ success: true, department: 'quality', date: today, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: `Department '${targetDepartment}' not yet supported` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Daily department summary failed:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
