import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAILS = new Set([
  'bwambaledenis@greatpearlcoffee.com',
  'tatwanzire@greatpearlcoffee.com',
  'musemawyclif@greatpearlcoffee.com',
  'fauzakusa@greatpearlcoffee.com',
])

const ADMIN_AMOUNT = 20000
const STAFF_AMOUNT = 10000

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '')

    // ---- Build a draft batch from active employees -------------------------
    if (action === 'create_draft') {
      const monthYear = String(body?.monthYear || '').trim()
      const actor = String(body?.actor || 'system')
      if (!/^\d{4}-\d{2}$/.test(monthYear)) return json({ ok: false, error: 'monthYear must be YYYY-MM' })

      const { data: existing } = await supabase
        .from('airtime_batches')
        .select('id, status')
        .eq('month_year', monthYear)
        .maybeSingle()
      if (existing) return json({ ok: false, error: `A batch for ${monthYear} already exists`, batchId: existing.id })

      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('email, name, phone, department, status, disabled')
        .eq('status', 'Active')
      if (empErr) return json({ ok: false, error: empErr.message })

      const rows = (employees || [])
        .filter((e) => e.disabled !== true && e.phone)
        .map((e) => ({
          employee_email: e.email,
          employee_name: e.name,
          phone: e.phone as string,
          department: e.department || null,
          tier: ADMIN_EMAILS.has(String(e.email).toLowerCase()) ? 'admin' : 'staff',
          amount: ADMIN_EMAILS.has(String(e.email).toLowerCase()) ? ADMIN_AMOUNT : STAFF_AMOUNT,
          included: true,
        }))

      const { data: batch, error: bErr } = await supabase
        .from('airtime_batches')
        .insert({
          month_year: monthYear,
          title: `Monthly Airtime ${monthYear}`,
          status: 'draft',
          created_by: actor,
          recipient_count: rows.length,
          total_amount: rows.reduce((s, r) => s + r.amount, 0),
        })
        .select('id')
        .single()
      if (bErr) return json({ ok: false, error: bErr.message })

      const { error: iErr } = await supabase
        .from('airtime_batch_items')
        .insert(rows.map((r) => ({ ...r, batch_id: batch.id })))
      if (iErr) return json({ ok: false, error: iErr.message })

      return json({ ok: true, batchId: batch.id, recipients: rows.length })
    }

    // ---- Approve a batch ---------------------------------------------------
    if (action === 'approve') {
      const batchId = String(body?.batchId || '')
      const actor = String(body?.actor || 'admin')
      if (!batchId) return json({ ok: false, error: 'batchId required' })

      const { data: items } = await supabase
        .from('airtime_batch_items')
        .select('amount, included')
        .eq('batch_id', batchId)
      const included = (items || []).filter((i) => i.included)

      const { error } = await supabase
        .from('airtime_batches')
        .update({
          status: 'approved',
          approved_by: actor,
          approved_at: new Date().toISOString(),
          recipient_count: included.length,
          total_amount: included.reduce((s, i) => s + Number(i.amount || 0), 0),
        })
        .eq('id', batchId)
        .eq('status', 'draft')
      if (error) return json({ ok: false, error: error.message })

      return json({ ok: true, recipients: included.length })
    }

    // ---- Disburse an approved batch via Yo Payments ------------------------
    if (action === 'disburse') {
      const batchId = String(body?.batchId || '')
      const actor = String(body?.actor || 'admin')
      if (!batchId) return json({ ok: false, error: 'batchId required' })

      const { data: batch } = await supabase
        .from('airtime_batches')
        .select('*')
        .eq('id', batchId)
        .maybeSingle()
      if (!batch) return json({ ok: false, error: 'Batch not found' })
      // 'processing' is allowed so a crashed/timed-out run can be retried.
      // Items already sent are skipped by the payment_status filter below.
      if (!['approved', 'partial', 'processing'].includes(batch.status)) {
        return json({ ok: false, error: `Batch must be approved before disbursing (current: ${batch.status})` })
      }

      const { data: items } = await supabase
        .from('airtime_batch_items')
        .select('*')
        .eq('batch_id', batchId)
        .eq('included', true)
        .in('payment_status', ['pending', 'failed'])

      await supabase.from('airtime_batches').update({ status: 'processing' }).eq('id', batchId)

      let sent = 0, failed = 0
      const sentPhones = new Set<string>()

      for (const item of items || []) {
        const cleanPhone = normalizePhone(item.phone)
        if (sentPhones.has(cleanPhone)) {
          await supabase.from('airtime_batch_items')
            .update({ payment_status: 'skipped', error_message: 'Duplicate phone in batch' })
            .eq('id', item.id)
          continue
        }

        const result = await yoSendAirtime({
          phone: cleanPhone,
          amount: Number(item.amount),
          narrative: `${batch.month_year} Airtime - ${item.employee_name} - Great Agro Coffee`,
        })
        const isPending22 = result.statusMessage?.includes('-22') ||
          (result.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
        const ok = result.success || isPending22

        if (!ok) {
          failed++
          await supabase.from('airtime_batch_items')
            .update({ payment_status: 'failed', error_message: result.errorMessage || 'Yo payment failed' })
            .eq('id', item.id)
          continue
        }

        sent++
        sentPhones.add(cleanPhone)
        await supabase.from('airtime_batch_items').update({
          payment_status: isPending22 ? 'pending_approval' : 'sent',
          yo_reference: result.transactionRef || null,
          error_message: null,
          paid_at: new Date().toISOString(),
        }).eq('id', item.id)

        // Ledger PAYOUT record (no wallet effect)
        try {
          const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: item.employee_email })
          if (unifiedId) {
            await supabase.from('ledger_entries').insert({
              user_id: String(unifiedId),
              entry_type: 'PAYOUT',
              amount: Number(item.amount),
              reference: `AIRTIME-${batch.month_year}-${item.id}`,
              metadata: {
                allowance_type: 'monthly_airtime',
                employee_name: item.employee_name,
                month_year: batch.month_year,
                yo_reference: result.transactionRef || null,
                disbursement_method: 'yo_airtime',
                phone: cleanPhone,
                batch_id: batchId,
                description: `${batch.month_year} airtime UGX ${Number(item.amount).toLocaleString()} sent to ${cleanPhone}`,
              },
            })
          }
        } catch (_) { /* non-blocking */ }

        // SMS confirmation
        try {
          await supabase.functions.invoke('send-sms', {
            body: {
              phone: item.phone,
              message: `Dear ${item.employee_name}, your ${batch.month_year} airtime allowance of UGX ${Number(item.amount).toLocaleString()} has been sent to ${cleanPhone}. - Great Agro Coffee`,
              userName: item.employee_name,
              messageType: 'monthly_allowance',
              recipientEmail: item.employee_email,
            },
          })
        } catch (_) { /* non-blocking */ }
      }

      const { data: remaining } = await supabase
        .from('airtime_batch_items')
        .select('id')
        .eq('batch_id', batchId)
        .eq('included', true)
        .in('payment_status', ['pending', 'failed'])

      const finalStatus = (remaining || []).length === 0 ? 'completed' : 'partial'
      await supabase.from('airtime_batches').update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        notes: `Disbursed by ${actor}: ${sent} sent, ${failed} failed`,
      }).eq('id', batchId)

      return json({ ok: true, sent, failed, status: finalStatus })
    }

    return json({ ok: false, error: 'Unknown action' })
  } catch (e) {
    return json({ ok: false, error: (e as Error).message })
  }
})
