import { yoSendAirtime, normalizePhone } from "../_shared/yo-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(body.phone || ""));
    const amount = Number(body.amount || 0);
    const narrative = String(body.narrative || "Airtime - Great Agro Coffee");
    if (!phone || amount < 500) {
      return new Response(JSON.stringify({ ok: false, error: "phone and amount>=500 required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = await yoSendAirtime({ phone, amount, narrative });
    return new Response(JSON.stringify({ ok: true, phone, amount, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});