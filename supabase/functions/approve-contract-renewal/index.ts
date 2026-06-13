import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { requestId, decision, adminEmail, adminNotes, overrides } = await req.json();
    if (!requestId || !['approve', 'reject'].includes(decision) || !adminEmail) {
      return json({ ok: false, error: 'Missing/invalid parameters' });
    }

    const { data: reqRow, error: reqErr } = await supabase
      .from('contract_renewal_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (reqErr || !reqRow) return json({ ok: false, error: 'Request not found' });
    if (reqRow.status !== 'pending') return json({ ok: false, error: 'Request already processed' });

    if (decision === 'reject') {
      await supabase
        .from('contract_renewal_requests')
        .update({ status: 'rejected', admin_email: adminEmail, admin_notes: adminNotes || null, rejected_at: new Date().toISOString() })
        .eq('id', requestId);

      await supabase.from('notifications').insert({
        recipient_email: reqRow.employee_email,
        title: 'Contract Renewal Rejected',
        message: `Your contract renewal request was not approved. ${adminNotes ? 'Note: ' + adminNotes : 'Please contact HR.'}`,
        type: 'contract_renewal',
      });

      // Email
      await supabase.functions.invoke('send-email-direct', {
        body: {
          to: reqRow.employee_email,
          cc: ['operations@greatpearlcoffee.com'],
          subject: 'Contract Renewal Request — Not Approved',
          html: `<p>Dear ${reqRow.employee_name},</p><p>Your contract renewal request submitted on ${new Date(reqRow.created_at).toLocaleDateString()} was <strong>not approved</strong> at this time.</p>${adminNotes ? `<p><strong>Reviewer note:</strong> ${adminNotes}</p>` : ''}<p>Please reach out to HR or the administrator for next steps.</p><p>Great Agro Coffee</p>`,
        },
      }).catch((e) => console.error('email error', e));

      return json({ ok: true, decision: 'rejected' });
    }

    // APPROVE
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + Number(reqRow.requested_months));

    // Fetch source contract to copy details
    const { data: source } = await supabase
      .from('employee_contracts')
      .select('*')
      .eq('id', reqRow.current_contract_id)
      .maybeSingle();

    // Mark old contract expired
    if (source) {
      await supabase
        .from('employee_contracts')
        .update({ status: 'expired' })
        .eq('id', source.id);
    }

    // Fallback to employee profile when there is no prior contract on file
    const { data: empProfile } = await supabase
      .from('employees')
      .select('id, position, department, salary, employee_id')
      .ilike('email', reqRow.employee_email)
      .maybeSingle();

    const ov = overrides || {};
    const finalPosition = (ov.position || source?.position || empProfile?.position || 'Staff').toString();
    const finalDepartment = (ov.department || source?.department || empProfile?.department || 'General').toString();
    const finalSalary = ov.salary != null ? Number(ov.salary) : (source?.salary || empProfile?.salary || 0);

    // Insert new contract
    const newContract = {
      employee_id: source?.employee_id || empProfile?.id || reqRow.employee_email,
      employee_name: reqRow.employee_name,
      employee_email: reqRow.employee_email,
      employee_gac_id: source?.employee_gac_id || empProfile?.employee_id || null,
      contract_type: source?.contract_type || 'Renewal',
      position: finalPosition,
      department: finalDepartment,
      contract_start_date: today.toISOString().split('T')[0],
      contract_end_date: endDate.toISOString().split('T')[0],
      contract_duration_months: reqRow.requested_months,
      salary: finalSalary,
      status: 'Active',
      renewal_count: (source?.renewal_count || 0) + 1,
      renewed_from_id: source?.id || null,
      notes: `Renewed via employee self-service. Reason: ${reqRow.reason}`,
      created_by: adminEmail,
    };
    const { data: created, error: cErr } = await supabase
      .from('employee_contracts')
      .insert(newContract)
      .select('id')
      .single();
    if (cErr) return json({ ok: false, error: 'Failed to create contract: ' + cErr.message });

    // Update employee profile fields: contact info from request + admin overrides
    const profileUpdate: Record<string, any> = {
      position: finalPosition,
      department: finalDepartment,
      salary: finalSalary,
    };
    if (reqRow.updated_phone) profileUpdate.phone = reqRow.updated_phone;
    if (reqRow.emergency_contact) profileUpdate.emergency_contact = reqRow.emergency_contact;
    if (ov.role) profileUpdate.role = ov.role;
    if (Array.isArray(ov.permissions) && ov.permissions.length) profileUpdate.permissions = ov.permissions;
    await supabase.from('employees').update(profileUpdate).ilike('email', reqRow.employee_email);

    await supabase
      .from('contract_renewal_requests')
      .update({
        status: 'approved',
        admin_email: adminEmail,
        admin_notes: adminNotes || null,
        approved_at: new Date().toISOString(),
        new_contract_id: created.id,
      })
      .eq('id', requestId);

    // In-app notification
    await supabase.from('notifications').insert({
      recipient_email: reqRow.employee_email,
      title: 'Contract Renewal Approved',
      message: `Your contract has been renewed for ${reqRow.requested_months} months, valid until ${endDate.toLocaleDateString()}.`,
      type: 'contract_renewal',
    });

    // Email confirmation
    await supabase.functions.invoke('send-email-direct', {
      body: {
        to: reqRow.employee_email,
        cc: ['operations@greatpearlcoffee.com'],
        subject: 'Contract Renewal Approved — Great Agro Coffee',
        html: `
          <p>Dear ${reqRow.employee_name},</p>
          <p>We are pleased to confirm that your <strong>contract has been renewed</strong>.</p>
          <table style="border-collapse:collapse;margin:12px 0">
            <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Duration</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${reqRow.requested_months} months</td></tr>
            <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Start date</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${today.toLocaleDateString()}</td></tr>
            <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>End date</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${endDate.toLocaleDateString()}</td></tr>
            <tr><td style="padding:6px 12px;border:1px solid #ddd"><strong>Position</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${source?.position || '—'}</td></tr>
          </table>
          <p>You now have full access to the system. Welcome back!</p>
          ${adminNotes ? `<p><strong>Note from admin:</strong> ${adminNotes}</p>` : ''}
          <p>Great Agro Coffee — Human Resources</p>
        `,
      },
    }).catch((e) => console.error('email error', e));

    return json({ ok: true, decision: 'approved', new_contract_id: created.id });
  } catch (e) {
    console.error('approve-contract-renewal error', e);
    return json({ ok: false, error: (e as Error).message });
  }
});