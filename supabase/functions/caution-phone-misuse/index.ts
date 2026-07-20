import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLovableEmail } from "npm:@lovable.dev/email-js@0.0.4";

const SITE_NAME = "Great Agro Coffee";
const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site";
const FROM_DOMAIN = "notify.greatpearlcoffeesystem.site";
const OPERATIONS_EMAIL = "operations@greatpearlcoffee.com";

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAUTION_SUBJECT = "Official Caution — Personal Use of Office Landline / Company Phones";

const cautionHtml = (recipientName: string, offenders: string) => `
  <p>Dear ${recipientName},</p>
  <p>This serves as an <strong>official caution</strong> to all employees of Great Agro Coffee (a member of Hello YEDA Coffee Company Limited) regarding the improper use of the office landline and company-issued phones.</p>
  <p>It has come to management's attention that the office landline and company phones are being used to make <strong>personal, non-business calls to friends and family</strong>. This has caused the company to lose airtime and credit on unproductive communication.</p>
  <p>Specifically, the following employees have been identified as the primary offenders in this recent review:</p>
  <ul>
    <li><strong>Bwambale Benson</strong></li>
    <li><strong>Onesmus Masika</strong></li>
  </ul>
  <p>${offenders}</p>
  <p>We are on a mission to drive this company to the export market. Every shilling and every minute matters. Using company resources for personal errands undermines that mission and will not be tolerated going forward.</p>
  <p><strong>Effective immediately:</strong></p>
  <ul>
    <li>The office landline and company phones are strictly for <strong>business use only</strong>.</li>
    <li>Any employee found making personal calls will be surcharged for the airtime consumed and may face further disciplinary action.</li>
    <li>Repeat offences will be escalated to HR for formal disciplinary proceedings.</li>
  </ul>
  <p>To recover the credit already lost, a deduction of <strong>UGX 20,000</strong> has been applied to the wallets of the two named employees above. Where a wallet balance is insufficient, the deduction is drawn from the employee's overdraft facility (a 2.75% access fee applies).</p>
  <p>Let us conduct ourselves professionally and protect the company's resources as our own.</p>
  <p>Regards,<br/>Management<br/>Great Agro Coffee — a member of Hello YEDA Coffee Company Limited</p>
  <p style="color:#666;font-size:12px;">P.O Box 431420, Kasese, Uganda · Operations: +256 393 101103</p>
`;

const cautionText = (recipientName: string, offenders: string) => `Dear ${recipientName},

This is an official caution to all employees of Great Agro Coffee (a member of Hello YEDA Coffee Company Limited) regarding improper use of the office landline and company-issued phones.

It has come to management's attention that these lines are being used for personal, non-business calls to friends and family, causing the company to lose airtime and credit on unproductive communication.

Primary offenders in this review:
 - Bwambale Benson
 - Onesmus Masika

${offenders}

Effective immediately:
 - Office landline and company phones are strictly for business use only.
 - Personal calls will be surcharged and may lead to disciplinary action.
 - Repeat offences escalate to HR.

A recovery deduction of UGX 20,000 has been applied to the wallets of the two named employees. Where balance is insufficient, the deduction draws from the overdraft facility (2.75% access fee applies).

Regards,
Management
Great Agro Coffee — a member of Hello YEDA Coffee Company Limited
P.O Box 431420, Kasese, Uganda · Operations: +256 393 101103`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const DEDUCTION = 20000;
    const today = new Date().toISOString().split("T")[0];

    // Fetch all active employees
    const { data: employees, error: empErr } = await admin
      .from("employees")
      .select("id, name, email, phone, status, disabled")
      .eq("status", "Active");
    if (empErr) throw empErr;

    const active = (employees || []).filter(
      (e: any) => !e.disabled && e.email && String(e.email).includes("@"),
    );

    // Identify offenders by name match
    const offenders = active.filter((e: any) => {
      const n = String(e.name || "").toLowerCase();
      return n.includes("benson") || n.includes("onesm");
    });

    const deductions: any[] = [];

    for (const emp of offenders) {
      try {
        const { data: uidData } = await admin.rpc("get_unified_user_id", { input_email: emp.email });
        const userId = (uidData as string) || emp.id;
        const referenceKey = `PHONE-MISUSE-${today}-${emp.id}`;

        const { data: existing } = await admin
          .from("ledger_entries")
          .select("id")
          .eq("reference", referenceKey)
          .maybeSingle();
        if (existing) {
          deductions.push({ name: emp.name, status: "already_deducted" });
          continue;
        }

        const { error: ledgerErr } = await admin.from("ledger_entries").insert({
          user_id: userId,
          entry_type: "ADJUSTMENT",
          amount: -DEDUCTION,
          reference: referenceKey,
          source_category: "OTHER",
          metadata: {
            type: "phone_misuse_recovery",
            bypass_treasury_check: true,
            employee_name: emp.name,
            employee_email: emp.email,
            date: today,
            reason: "Personal use of office landline / company phone",
            description: `Phone misuse recovery UGX ${DEDUCTION.toLocaleString()} (${today})`,
          },
        });
        if (ledgerErr) {
          deductions.push({ name: emp.name, status: "ledger_failed", error: ledgerErr.message });
          continue;
        }

        deductions.push({ name: emp.name, status: "deducted", amount: DEDUCTION });
      } catch (e: any) {
        deductions.push({ name: emp.name, status: "error", error: e.message });
      }
    }

    const offenderSummary = deductions
      .filter((d) => d.status === "deducted" || d.status === "already_deducted")
      .map((d) => `<em>${d.name}</em>`)
      .join(", ");
    const offenderLine = offenderSummary
      ? `A recovery deduction of UGX ${DEDUCTION.toLocaleString()} has been applied to the wallets of: ${offenderSummary}.`
      : `A recovery deduction of UGX ${DEDUCTION.toLocaleString()} has been applied to the named employees' wallets.`;

    // Broadcast caution email to all active employees
    const emailResults: any[] = [];
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ ok: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const stamp = Date.now();
    for (const emp of active) {
      try {
        const idem = `phone-misuse-${stamp}-${String(emp.email).toLowerCase()}`;
        await sendLovableEmail(
          {
            to: emp.email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: CAUTION_SUBJECT,
            html: cautionHtml(emp.name, offenderLine),
            text: cautionText(emp.name, offenderLine),
            purpose: "transactional",
            label: "phone-misuse-caution",
            idempotency_key: idem,
            unsubscribe_token: token(),
          },
          { apiKey: lovableApiKey, idempotencyKey: idem },
        );
        emailResults.push({ name: emp.name, status: "sent" });
      } catch (e: any) {
        const errMsg = e?.message || String(e);
        console.error(`Email failed for ${emp.email}:`, errMsg);
        emailResults.push({ name: emp.name, email: emp.email, status: "email_failed", error: errMsg });
      }
    }

    // CC operations
    try {
      const opsIdem = `phone-misuse-ops-${stamp}`;
      await sendLovableEmail(
        {
          to: OPERATIONS_EMAIL,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: `[CC] ${CAUTION_SUBJECT}`,
          html: cautionHtml("Operations Team", offenderLine),
          text: cautionText("Operations Team", offenderLine),
          purpose: "transactional",
          label: "phone-misuse-caution-ops",
          idempotency_key: opsIdem,
          unsubscribe_token: token(),
        },
        { apiKey: lovableApiKey, idempotencyKey: opsIdem },
      );
    } catch (_) {}

    return new Response(
      JSON.stringify({
        ok: true,
        deductions,
        emails_sent: emailResults.filter((r) => r.status === "sent").length,
        emails_failed: emailResults.filter((r) => r.status !== "sent").length,
        results: emailResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});