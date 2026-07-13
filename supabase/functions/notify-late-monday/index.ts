import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];
    const { data: entries, error } = await admin
      .from("ledger_entries")
      .select("reference, metadata")
      .like("reference", `LATE-MONDAY-${today}-%`);
    if (error) throw error;

    const results: any[] = [];
    for (const e of entries || []) {
      const meta: any = e.metadata || {};
      const name = meta.employee_name;
      const email = meta.employee_email;
      if (!email) { results.push({ name, status: "no_email" }); continue; }

      const { data: emp } = await admin
        .from("employees")
        .select("phone")
        .eq("email", email)
        .maybeSingle();
      const phone = emp?.phone;

      const html = `<p>Dear ${name},</p>
        <p>A deduction of <strong>UGX 5,000</strong> has been applied to your wallet today (${today}) for late arrival on Monday.</p>
        <p>If your balance was insufficient, an overdraft was auto-drawn (with a 2.75% access fee) to cover the deduction.</p>
        <p>Please ensure punctual arrival going forward. If you believe this is in error, contact HR/Admin.</p>
        <p>— Great Agro Coffee</p>`;

      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            to: email,
            cc: "operations@greatpearlcoffee.com",
            subject: "Late Arrival Deduction — UGX 5,000",
            html,
            recipientPhone: phone,
            recipientName: name,
          },
        });
      } catch (err: any) {
        results.push({ name, status: "email_failed", error: err.message });
        continue;
      }

      if (phone) {
        try {
          await admin.functions.invoke("send-sms", {
            body: {
              phone,
              message: `Great Agro Coffee: UGX 5,000 has been deducted from your wallet today (${today}) for late arrival on Monday. If balance was low, an overdraft (2.75% fee) covered it. Contact HR if in error.`,
              userName: name,
              messageType: "late_deduction",
            },
          });
        } catch (err: any) {
          results.push({ name, status: "sms_failed", error: err.message });
          continue;
        }
      }

      results.push({ name, status: "sent", phone: phone || null });
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});