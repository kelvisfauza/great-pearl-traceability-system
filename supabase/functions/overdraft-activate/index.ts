import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user_email, action } = await req.json();
    if (!user_email) return new Response(JSON.stringify({ ok: false, error: "user_email required" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const rpc = action === "deactivate" ? "overdraft_deactivate" : "overdraft_activate";
    const { data, error } = await admin.rpc(rpc, { p_email: user_email });
    if (error) return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Send activation / deactivation confirmation email (MoMo-style)
    try {
      const limit = Number((data as any)?.limit || 0);
      const ref = `OD-${action === "deactivate" ? "CLOSE" : "ACT"}-${Date.now()}`;
      const dateStr = new Date().toISOString().replace("T", " ").slice(0, 19);
      const subject = action === "deactivate"
        ? "Overdraft account closed"
        : "Overdraft activated";
      const body = action === "deactivate"
        ? `<p>Your OVERDRAFT account has been closed on ${dateStr}. Reference: ${ref}.</p>
           <p>You can reactivate any time once a limit is available.</p>
           <p>— Great Agro Coffee</p>`
        : `<p>Your OVERDRAFT has been activated on ${dateStr}. Your available OVERDRAFT balance is UGX ${limit.toLocaleString()}. Reference: ${ref}.</p>
           <ul>
             <li><strong>Access fee:</strong> 5% per draw (added to outstanding)</li>
             <li><strong>Auto-use:</strong> Fills the gap automatically when your wallet runs short on withdrawals, transfers or loan payments.</li>
             <li><strong>Auto-recovery:</strong> Any incoming credit (salary, loyalty, deposits) clears outstanding first.</li>
             <li><strong>30-day rule:</strong> If not cleared in 30 days the overdraft is frozen until repaid.</li>
           </ul>
           <p>— Great Agro Coffee</p>`;
      await admin.functions.invoke("send-transactional-email", {
        body: {
          to: user_email,
          cc: "operations@greatpearlcoffee.com",
          subject,
          html: body,
        },
      });
    } catch (_) { /* ignore email errors */ }

    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});