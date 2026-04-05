import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // Support both GET (email click) and POST (confirmation page)
    let token: string | null = null
    let action: string | null = null
    let rejectReason: string | null = null

    if (req.method === 'GET') {
      const url = new URL(req.url)
      token = url.searchParams.get('token')
      action = url.searchParams.get('action')
    } else {
      const body = await req.json()
      token = body.token
      action = body.action
      rejectReason = body.rejectReason
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Look up the token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('approval_action_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !tokenRecord) {
      return new Response(JSON.stringify({ 
        error: 'invalid_token',
        message: 'This approval link is invalid or does not exist.' 
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if already used
    if (tokenRecord.status === 'used') {
      return new Response(JSON.stringify({ 
        error: 'already_used',
        message: 'This approval link has already been used.',
        used_at: tokenRecord.used_at
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if expired
    if (tokenRecord.status === 'expired' || new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        error: 'expired',
        message: 'This approval link has expired.'
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch the approval request
    const { data: request, error: reqError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', tokenRecord.request_id)
      .single()

    if (reqError || !request) {
      return new Response(JSON.stringify({ 
        error: 'request_not_found',
        message: 'The associated approval request was not found.'
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If just validating (GET request or action=validate), return request info
    if (req.method === 'GET' || action === 'validate') {
      return new Response(JSON.stringify({
        status: 'valid',
        token_action: tokenRecord.action_type,
        approval_stage: tokenRecord.approval_stage,
        approver_name: tokenRecord.approver_name,
        approver_email: tokenRecord.approver_email,
        request: {
          id: request.id,
          title: request.title,
          description: request.description,
          amount: request.amount,
          type: request.type,
          department: request.department,
          requestedby: request.requestedby,
          requestedby_name: request.requestedby_name,
          daterequested: request.daterequested,
          priority: request.priority,
          status: request.status,
        }
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Self-approval check
    if (request.requestedby === tokenRecord.approver_email) {
      return new Response(JSON.stringify({ 
        error: 'self_approval',
        message: 'You cannot approve your own request.'
      }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Process the action
    const now = new Date().toISOString()
    const stage = tokenRecord.approval_stage

    if (action === 'approve') {
      const updateFields: Record<string, any> = { updated_at: now }

      if (stage === 'finance') {
        updateFields.finance_approved = true
        updateFields.finance_approved_by = tokenRecord.approver_email
        updateFields.finance_approved_at = now
        updateFields.finance_reviewed = true
        updateFields.finance_review_by = tokenRecord.approver_email
        updateFields.finance_review_at = now
        updateFields.status = 'Pending Admin'
      } else if (stage === 'admin') {
        updateFields.admin_approved = true
        updateFields.admin_approved_by = tokenRecord.approver_email
        updateFields.admin_approved_at = now
        // Check if three-stage approval
        if (request.requires_three_approvals) {
          updateFields.admin_approved_1 = true
          updateFields.admin_approved_1_by = tokenRecord.approver_email
          updateFields.admin_approved_1_at = now
          updateFields.status = 'Pending Admin 2'
        } else {
          updateFields.status = 'Approved'
        }
      } else if (stage === 'admin_2') {
        updateFields.admin_approved_2 = true
        updateFields.admin_approved_2_by = tokenRecord.approver_email
        updateFields.admin_approved_2_at = now
        updateFields.status = 'Approved'
      } else if (stage === 'admin_final') {
        updateFields.admin_final_approval = true
        updateFields.admin_final_approval_by = tokenRecord.approver_email
        updateFields.admin_final_approval_at = now
        updateFields.status = 'Approved'
      }

      const { error: updateError } = await supabase
        .from('approval_requests')
        .update(updateFields)
        .eq('id', request.id)

      if (updateError) throw updateError

      // Mark token as used
      await supabase
        .from('approval_action_tokens')
        .update({ status: 'used', used_at: now })
        .eq('id', tokenRecord.id)

      // If fully approved, invalidate all remaining tokens for this request
      if (updateFields.status === 'Approved') {
        await supabase.rpc('invalidate_request_tokens', { p_request_id: request.id })
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'approved',
        new_status: updateFields.status,
        message: updateFields.status === 'Approved' 
          ? 'Request has been fully approved!' 
          : `Request approved at ${stage} stage. Moving to next approver.`
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'reject') {
      await supabase
        .from('approval_requests')
        .update({
          status: 'Rejected',
          rejection_reason: rejectReason || `Rejected by ${tokenRecord.approver_name} via email`,
          rejection_comments: rejectReason || '',
          updated_at: now,
        })
        .eq('id', request.id)

      // Mark token as used
      await supabase
        .from('approval_action_tokens')
        .update({ status: 'used', used_at: now })
        .eq('id', tokenRecord.id)

      // Invalidate all remaining tokens for this request
      await supabase.rpc('invalidate_request_tokens', { p_request_id: request.id })

      return new Response(JSON.stringify({
        success: true,
        action: 'rejected',
        new_status: 'Rejected',
        message: 'Request has been rejected.'
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use approve or reject.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Approval action error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
