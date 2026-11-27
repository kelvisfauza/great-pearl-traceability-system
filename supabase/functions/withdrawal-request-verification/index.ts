import '../_shared/redact-logs.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireStaff } from '../_shared/internal-auth.ts';
import { deliveryAccepted } from '../_shared/message-policy.ts';
import { fiveDigitCode } from '../_shared/secure-random.ts';
import { deliverWithdrawalCode, withdrawalCodeSms } from './rules.ts';

const json = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const caller = await requireStaff(req, corsHeaders);
    if (caller instanceof Response) return caller;
    if (caller.internal || !caller.userId || !caller.email) {
      return json({ ok: false, success: false, error: 'Please sign in to verify your own withdrawal.' });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    if (!['send_code', 'verify_code'].includes(action)) {
      return json({ ok: false, success: false, error: 'Choose send_code or verify_code.' });
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: employee, error: employeeError } = await db
      .from('employees')
      .select('name, phone, status, disabled')
      .ilike('email', caller.email)
      .maybeSingle();
    if (employeeError || !employee || employee.disabled === true || String(employee.status || '').toLowerCase() !== 'active') {
      return json({ ok: false, success: false, error: 'Your active employee record could not be verified. Contact HR.' });
    }

    if (action === 'verify_code') {
      const code = String(body.code || '').trim();
      if (!/^\d{5}$/.test(code)) {
        return json({ ok: false, success: false, error: 'Enter the 5-digit code.' });
      }
      const { data: result, error } = await db.rpc('verify_withdrawal_request_otp', {
        p_user_id: caller.userId,
        p_code: code,
      });
      if (error) throw new Error('Verification is temporarily unavailable.');
      const check = result || {};
      if (check.success === true) return json({ ok: true, success: true, message: 'Withdrawal code verified.' });
      const messages: Record<string, string> = {
        no_code: 'Request a new withdrawal code.',
        expired: 'This code has expired. Request a new one.',
        too_many_attempts: 'Too many incorrect attempts. Request a new code.',
        invalid: `Incorrect code.${Number.isFinite(Number(check.attempts_left)) ? ` ${check.attempts_left} attempts remaining.` : ''}`,
      };
      return json({ ok: false, success: false, error: messages[String(check.error)] || messages.invalid });
    }

    const code = fiveDigitCode();
    const { data: issued, error: issueError } = await db.rpc('issue_withdrawal_request_otp', {
      p_user_id: caller.userId,
      p_employee_email: caller.email,
      p_phone: employee.phone || '',
      p_code: code,
    });
    if (issueError) throw new Error('Could not prepare a withdrawal code.');
    if (issued?.success === false && issued?.error === 'throttled') {
      const wait = Math.max(1, Number(issued.retry_after) || 30);
      return json({ ok: false, success: false, error: `A code was just requested. Try again in ${wait} seconds.`, retryAfter: wait });
    }
    if (issued?.success !== true) throw new Error('Could not prepare a withdrawal code.');

    const amount = Number(body.amount);
    const method = typeof body.method === 'string' ? body.method.slice(0, 30) : undefined;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const sendSms = async () => {
      if (!employee.phone) return false;
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            phone: employee.phone,
            message: withdrawalCodeSms(employee.name || 'Employee', code),
            userName: employee.name,
            recipientEmail: caller.email,
            messageType: 'withdrawal_verification',
            priority: 'premium',
            triggeredBy: 'withdrawal-request-verification',
            requestId: issued.id,
          }),
        });
        return deliveryAccepted(response.ok, await response.json().catch(() => null));
      } catch {
        return false;
      }
    };

    const sendEmail = async () => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            templateName: 'withdrawal-verification',
            recipientEmail: caller.email,
            idempotencyKey: `withdrawal-request-otp-${issued.id}`,
            skipSms: true,
            templateData: {
              name: employee.name,
              code,
              amount: Number.isFinite(amount) && amount > 0 ? amount.toLocaleString('en-UG') : undefined,
              method,
            },
          }),
        });
        return deliveryAccepted(response.ok, await response.json().catch(() => null));
      } catch {
        return false;
      }
    };

    const delivery = await deliverWithdrawalCode(sendSms, sendEmail);
    if (!delivery.ok) {
      return json({ ok: false, success: false, error: 'The code could not be delivered by SMS or email. Please try again.' });
    }

    return json({
      ok: true,
      success: true,
      delivery: delivery.channel,
      expiresAt: issued.expires_at,
      message: delivery.channel === 'sms' ? 'Withdrawal code sent to your phone.' : 'SMS failed, so the code was sent to your email.',
    });
  } catch (error) {
    console.error('Withdrawal verification failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ ok: false, success: false, error: error instanceof Error ? error.message : 'Withdrawal verification failed.' });
  }
});
