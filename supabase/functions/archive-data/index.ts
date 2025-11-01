import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { archivePeriod, archivedBy, notes, clearAfterArchive = false } = await req.json()

    console.log('📦 Starting archive process for period:', archivePeriod)

    const recordsArchived = {
      approvalRequests: 0,
      cashTransactions: 0,
      paymentRecords: 0,
      moneyRequests: 0
    }

    // Archive approval requests (only approved/completed ones)
    const { data: approvalRequests } = await supabaseClient
      .from('approval_requests')
      .select('*')
      .eq('status', 'Approved')

    if (approvalRequests && approvalRequests.length > 0) {
      const archivedRequests = approvalRequests.map(req => ({
        original_id: req.id,
        type: req.type,
        title: req.title,
        description: req.description,
        amount: req.amount,
        requestedby: req.requestedby,
        daterequested: req.daterequested,
        priority: req.priority,
        status: req.status,
        details: req.details,
        finance_approved: req.finance_approved,
        admin_approved: req.admin_approved,
        finance_approved_at: req.finance_approved_at,
        admin_approved_at: req.admin_approved_at,
        finance_approved_by: req.finance_approved_by,
        admin_approved_by: req.admin_approved_by,
        archived_by: archivedBy,
        archive_period: archivePeriod,
        created_at: req.created_at,
        updated_at: req.updated_at
      }))

      const { error: archiveError } = await supabaseClient
        .from('archived_approval_requests')
        .insert(archivedRequests)

      if (archiveError) throw archiveError

      recordsArchived.approvalRequests = archivedRequests.length

      // Clear if requested
      if (clearAfterArchive) {
        const idsToDelete = approvalRequests.map(r => r.id)
        await supabaseClient
          .from('approval_requests')
          .delete()
          .in('id', idsToDelete)
      }
    }

    // Archive confirmed cash transactions
    const { data: cashTransactions } = await supabaseClient
      .from('finance_cash_transactions')
      .select('*')
      .eq('transaction_type', 'DEPOSIT')
      .not('confirmed_at', 'is', null)

    if (cashTransactions && cashTransactions.length > 0) {
      const archivedTransactions = cashTransactions.map(txn => ({
        original_id: txn.id,
        transaction_type: txn.transaction_type,
        amount: txn.amount,
        notes: txn.notes,
        reference: txn.reference,
        confirmed_at: txn.confirmed_at,
        confirmed_by: txn.confirmed_by,
        archived_by: archivedBy,
        archive_period: archivePeriod,
        created_at: txn.created_at
      }))

      const { error: archiveError } = await supabaseClient
        .from('archived_finance_cash_transactions')
        .insert(archivedTransactions)

      if (archiveError) throw archiveError

      recordsArchived.cashTransactions = archivedTransactions.length

      if (clearAfterArchive) {
        const idsToDelete = cashTransactions.map(t => t.id)
        await supabaseClient
          .from('finance_cash_transactions')
          .delete()
          .in('id', idsToDelete)
      }
    }

    // Archive payment records
    const { data: paymentRecords } = await supabaseClient
      .from('payment_records')
      .select('*')

    if (paymentRecords && paymentRecords.length > 0) {
      const archivedPayments = paymentRecords.map(payment => ({
        original_id: payment.id,
        supplier_name: payment.supplier_name,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        reference: payment.reference,
        notes: payment.notes,
        recorded_by: payment.recorded_by,
        archived_by: archivedBy,
        archive_period: archivePeriod,
        created_at: payment.created_at
      }))

      const { error: archiveError } = await supabaseClient
        .from('archived_payment_records')
        .insert(archivedPayments)

      if (archiveError) throw archiveError

      recordsArchived.paymentRecords = archivedPayments.length

      if (clearAfterArchive) {
        const idsToDelete = paymentRecords.map(p => p.id)
        await supabaseClient
          .from('payment_records')
          .delete()
          .in('id', idsToDelete)
      }
    }

    // Archive completed money requests
    const { data: moneyRequests } = await supabaseClient
      .from('money_requests')
      .select('*')
      .eq('status', 'completed')

    if (moneyRequests && moneyRequests.length > 0) {
      const archivedMoneyRequests = moneyRequests.map(req => ({
        original_id: req.id,
        employee_id: req.employee_id,
        employee_name: req.employee_name,
        request_type: req.request_type,
        amount: req.amount,
        reason: req.reason,
        status: req.status,
        approved_by: req.approved_by,
        approved_at: req.approved_at,
        archived_by: archivedBy,
        archive_period: archivePeriod,
        created_at: req.created_at
      }))

      const { error: archiveError } = await supabaseClient
        .from('archived_money_requests')
        .insert(archivedMoneyRequests)

      if (archiveError) throw archiveError

      recordsArchived.moneyRequests = archivedMoneyRequests.length

      if (clearAfterArchive) {
        const idsToDelete = moneyRequests.map(m => m.id)
        await supabaseClient
          .from('money_requests')
          .delete()
          .in('id', idsToDelete)
      }
    }

    // Record archive history
    const { error: historyError } = await supabaseClient
      .from('archive_history')
      .insert({
        archive_period: archivePeriod,
        archived_by: archivedBy,
        records_archived: recordsArchived,
        notes: notes
      })

    if (historyError) throw historyError

    console.log('✅ Archive completed:', recordsArchived)

    return new Response(
      JSON.stringify({
        success: true,
        recordsArchived,
        cleared: clearAfterArchive
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Archive error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})