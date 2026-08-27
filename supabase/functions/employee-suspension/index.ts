import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const COMPANY = "Great Agro Coffee";
const PARENT = "Hello YEDA COFFEE COMPANY LIMITED";

function fmtDate(d: string): string {
  try {
    return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    });
  } catch {
    return d;
  }
}

function payLabel(p: string): string {
  if (p === "no_pay") return "without pay";
  if (p === "full_pay") return "on full pay";
  return "on half pay";
}

function buildSuspensionLetter(o: {
  name: string; reason: string; details?: string; payStatus: string;
  startDate: string; endDate: string; reportBackDate?: string; days: number;
}): string {
  const detailPara = o.details?.trim()
    ? `\n${o.details.trim()}\n`
    : "";
  return `Dear ${o.name},

RE: ${o.days}-DAY SUSPENSION FROM DUTY

REASON FOR SUSPENSION: ${o.reason}
${detailPara}
Management has reviewed the circumstances stated above and established that your conduct constitutes a breach of the Company's attendance and punctuality requirements, leave and absence-approval procedures, duty to promptly communicate with management, Employee Code of Conduct and standards of accountability, and obligation to perform assigned duties responsibly.

You are therefore suspended from duty for ${o.days} calendar days ${payLabel(o.payStatus)}, effective ${fmtDate(o.startDate)} to ${fmtDate(o.endDate)}, pending review of the circumstances surrounding this matter.

During the suspension:

- You shall not enter any Company office, store, laboratory or other work premises without written authorization.
- Your access to all Company systems, email accounts, applications, databases and shared platforms shall be temporarily disabled.
- You shall not access, alter, remove or communicate Company information or represent the Company in any capacity.
- You must remain available by telephone or email if management requires clarification or invites you to a disciplinary meeting.

You must submit a written explanation within 48 hours of receiving this email. Your explanation and any supporting evidence will be considered before management concludes the disciplinary review.

You are required to report to the Operations Office at 8:00 a.m. on ${fmtDate(o.reportBackDate || o.endDate)} unless informed otherwise in writing.

RIGHT TO APPEAL

You may appeal this suspension by submitting a written appeal to the Director or Company Secretary within three working days of receiving this email. Your appeal should clearly state the grounds and include any supporting evidence. Submission of an appeal shall not automatically suspend this decision unless management communicates otherwise in writing.

You also retain any right available under applicable employment law to lodge a complaint with the responsible Labour Officer.

Any further unauthorized absence, failure to communicate, breach of access restrictions or similar misconduct may result in further disciplinary action in accordance with Company policy and applicable law.

Regards,

Management
${COMPANY}
A member of ${PARENT}
Operations Office: +256393101103
P.O Box 431420, Kasese, Uganda`;
}

function buildLiftLetter(o: { name: string; notes?: string }): string {
  return `Dear ${o.name},

RE: LIFTING OF SUSPENSION AND RESTORATION OF SYSTEM ACCESS

Management has concluded the review of your suspension. Your suspension is hereby lifted with immediate effect and your access to Company systems, email accounts, applications and shared platforms has been restored.
${o.notes?.trim() ? `\n${o.notes.trim()}\n` : ""}
You are expected to resume your duties in full and to observe the Company's attendance, communication and Code of Conduct requirements at all times.

Regards,

Management
${COMPANY}
A member of ${PARENT}
Operations Office: +256393101103`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    const callerEmail = userData?.user?.email?.toLowerCase();
    if (!callerEmail) return respond(false, { error: "unauthorized" }, 401);

    const { data: caller } = await admin
      .from("employees")
      .select("name,email,role")
      .ilike("email", callerEmail)
      .maybeSingle();

    if (!caller || caller.role !== "Administrator") {
      return respond(false, { error: "Only administrators can manage suspensions" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body.action;

    const notify = async (email: string, phone: string | null, subject: string, letter: string, smsText: string) => {
      const results: Record<string, unknown> = {};
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateName: "general-notification",
            recipientEmail: email,
            templateData: { title: subject, subject, message: letter, recipientName: body.employeeName },
          }),
        });
        results.email = { ok: r.ok, status: r.status };
      } catch (e) {
        results.email = { ok: false, error: (e as Error).message };
      }
      if (phone) {
        try {
          const r = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: "POST",
            headers: {
              Authorization: authHeader || `Bearer ${serviceKey}`,
              apikey: anonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone,
              message: smsText,
              userName: body.employeeName,
              messageType: "suspension_notice",
              recipientEmail: email,
            }),
          });
          results.sms = { ok: r.ok, status: r.status };
        } catch (e) {
          results.sms = { ok: false, error: (e as Error).message };
        }
      }
      return results;
    };

    if (action === "suspend") {
      const {
        employeeId, employeeName, employeeEmail, employeePhone,
        reason, details, payStatus = "half_pay",
        startDate, endDate, reportBackDate,
      } = body;

      if (!employeeEmail || !reason || !startDate || !endDate) {
        return respond(false, { error: "employeeEmail, reason, startDate and endDate are required" });
      }

      const days = Math.max(
        1,
        Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1,
      );

      const letter = buildSuspensionLetter({
        name: employeeName, reason, details, payStatus, startDate, endDate, reportBackDate, days,
      });

      // 1) Block the account
      const { error: blockErr } = await admin
        .from("employees")
        .update({
          disabled: true,
          disabled_reason: `Suspended: ${reason}`,
          disabled_at: new Date().toISOString(),
        })
        .ilike("email", employeeEmail);
      if (blockErr) return respond(false, { error: blockErr.message });

      // 2) Record the suspension
      const { data: record, error: insErr } = await admin
        .from("employee_suspensions")
        .insert({
          employee_id: employeeId || null,
          employee_name: employeeName,
          employee_email: employeeEmail,
          employee_phone: employeePhone || null,
          reason,
          details: details || null,
          pay_status: payStatus,
          start_date: startDate,
          end_date: endDate,
          report_back_date: reportBackDate || null,
          letter_body: letter,
          status: "active",
          issued_by: caller.email,
        })
        .select()
        .single();
      if (insErr) return respond(false, { error: insErr.message });

      // 3) Notify
      const subject = `Notice of Suspension from Duty — ${employeeName}`;
      const sms = `Dear ${employeeName}, you have been suspended from duty for ${days} day(s) ${payLabel(payStatus)} (${startDate} to ${endDate}). Reason: ${reason}. A formal letter has been sent to your email. System access is disabled. - ${COMPANY}`;
      const delivery = await notify(employeeEmail, employeePhone || null, subject, letter, sms);

      return respond(true, { record, letter, delivery });
    }

    if (action === "lift") {
      const { suspensionId, employeeEmail, employeeName, employeePhone, notes } = body;
      if (!employeeEmail) return respond(false, { error: "employeeEmail is required" });

      const { error: unblockErr } = await admin
        .from("employees")
        .update({ disabled: false, disabled_reason: null, disabled_at: null })
        .ilike("email", employeeEmail);
      if (unblockErr) return respond(false, { error: unblockErr.message });

      if (suspensionId) {
        await admin
          .from("employee_suspensions")
          .update({
            status: "lifted",
            lifted_by: caller.email,
            lifted_at: new Date().toISOString(),
            lift_notes: notes || null,
          })
          .eq("id", suspensionId);
      } else {
        await admin
          .from("employee_suspensions")
          .update({
            status: "lifted",
            lifted_by: caller.email,
            lifted_at: new Date().toISOString(),
            lift_notes: notes || null,
          })
          .ilike("employee_email", employeeEmail)
          .eq("status", "active");
      }

      const letter = buildLiftLetter({ name: employeeName, notes });
      const subject = `Suspension Lifted — Access Restored`;
      const sms = `Dear ${employeeName}, your suspension has been lifted and your ${COMPANY} system access is restored. You may log in again. - ${COMPANY}`;
      const delivery = await notify(employeeEmail, employeePhone || null, subject, letter, sms);

      return respond(true, { letter, delivery });
    }

    return respond(false, { error: "Unknown action" });
  } catch (e) {
    return respond(false, { error: (e as Error).message }, 500);
  }
});
