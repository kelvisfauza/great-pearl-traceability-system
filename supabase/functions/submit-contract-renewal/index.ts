import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown, max = 1000) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Please sign in again before submitting the renewal." });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) {
      return json({ ok: false, error: "Your login session could not be verified. Please sign in again." });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "negotiate" ? "negotiate" : "accept";
    const requestedMonths = Number(body.requested_months);
    if (!Number.isInteger(requestedMonths) || requestedMonths < 3 || requestedMonths > 6) {
      return json({ ok: false, error: "Renewal duration must be between 3 and 6 months." });
    }

    const { data: employeeByAuth } = await supabase
      .from("employees")
      .select("id, auth_user_id, email, name, phone, position, department, status, disabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    let employee = employeeByAuth;
    if (!employee && user.email) {
      const { data: employeeByEmail } = await supabase
        .from("employees")
        .select("id, auth_user_id, email, name, phone, position, department, status, disabled")
        .ilike("email", user.email)
        .maybeSingle();
      employee = employeeByEmail;
    }

    if (!employee) {
      return json({ ok: false, error: "No active employee record was found for this login." });
    }
    if (employee.disabled === true || String(employee.status || "").toLowerCase() !== "active") {
      return json({ ok: false, error: "This employee account is not active." });
    }

    const { data: existing } = await supabase
      .from("contract_renewal_requests")
      .select("id, status")
      .ilike("employee_email", employee.email)
      .in("status", ["pending", "negotiating"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return json({ ok: false, error: "You already have a renewal request awaiting review." });
    }

    const currentContractId = clean(body.current_contract_id, 80);
    if (currentContractId) {
      const { data: contract } = await supabase
        .from("employee_contracts")
        .select("id, employee_email")
        .eq("id", currentContractId)
        .maybeSingle();
      if (!contract || String(contract.employee_email || "").toLowerCase() !== String(employee.email).toLowerCase()) {
        return json({ ok: false, error: "The selected contract does not belong to this employee." });
      }
    }

    const reason = clean(body.reason, mode === "negotiate" ? 1000 : 500);
    if (!reason || reason.length < 10) {
      return json({ ok: false, error: mode === "negotiate" ? "Please explain your requested changes." : "Please provide a renewal reason." });
    }

    const insertPayload: Record<string, unknown> = {
      employee_email: employee.email,
      employee_name: employee.name,
      current_contract_id: currentContractId,
      requested_months: requestedMonths,
      reason,
      updated_phone: clean(body.updated_phone, 40),
      status: mode === "negotiate" ? "negotiating" : "pending",
    };

    if (mode === "accept") {
      const signature = clean(body.signature, 200);
      if (signature?.toLowerCase() !== String(employee.name || "").trim().toLowerCase()) {
        return json({ ok: false, error: "Digital signature must match your registered full name." });
      }
      if (body.policy_acknowledged !== true) {
        return json({ ok: false, error: "Please acknowledge the company policies before submitting." });
      }

      Object.assign(insertPayload, {
        emergency_contact: clean(body.emergency_contact, 200),
        nssf_number: clean(body.nssf_number, 80),
        tin_number: clean(body.tin_number, 80),
        bank_name: clean(body.bank_name, 120),
        bank_account: clean(body.bank_account, 80),
        policy_acknowledged: true,
        signature,
      });
    } else {
      const requestedSalary = body.requested_salary === null || body.requested_salary === undefined || body.requested_salary === ""
        ? null
        : Number(body.requested_salary);
      if (requestedSalary !== null && (!Number.isFinite(requestedSalary) || requestedSalary < 0)) {
        return json({ ok: false, error: "Requested salary must be a valid amount." });
      }
      const hasAnyChange = requestedSalary !== null
        || !!clean(body.requested_position, 160)
        || !!clean(body.requested_role_changes, 700)
        || !!clean(body.requested_other_terms, 700);
      if (!hasAnyChange) {
        return json({ ok: false, error: "Fill at least one requested change field." });
      }

      const grace = new Date();
      grace.setDate(grace.getDate() + 7);
      Object.assign(insertPayload, {
        requested_salary: requestedSalary,
        requested_position: clean(body.requested_position, 160),
        requested_role_changes: clean(body.requested_role_changes, 700),
        requested_other_terms: clean(body.requested_other_terms, 700),
        negotiation_notes: reason,
        grace_period_until: grace.toISOString(),
        policy_acknowledged: false,
        signature: employee.name,
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("contract_renewal_requests")
      .insert(insertPayload)
      .select("id, status")
      .single();

    if (insertError) {
      console.error("submit-contract-renewal insert error", insertError);
      return json({ ok: false, error: insertError.message || "Failed to submit renewal request." });
    }

    return json({ ok: true, request: inserted });
  } catch (error) {
    console.error("submit-contract-renewal error", error);
    return json({ ok: false, error: (error as Error).message || "Unexpected renewal submission error." });
  }
});