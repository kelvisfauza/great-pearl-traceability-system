import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

function buildBalanceXml(username: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${username}</APIUsername>
    <APIPassword>${password}</APIPassword>
    <Method>acacctbalance</Method>
  </Request>
</AutoCreate>`;
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const username = Deno.env.get("YO_API_USERNAME");
    const password = Deno.env.get("YO_API_PASSWORD");
    if (!username || !password) {
      return new Response(
        JSON.stringify({ ok: false, error: "Yo Payments credentials not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const xmlBody = buildBalanceXml(username, password);
    const yoResp = await fetch(YO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "Accept": "text/xml",
        "Cache-Control": "no-cache",
      },
      body: xmlBody,
    });
    const xml = await yoResp.text();
    console.log("Yo balance response:", xml.slice(0, 500));

    const status = extractTag(xml, "Status");
    if (status !== "OK") {
      const msg = extractTag(xml, "StatusMessage") || extractTag(xml, "ErrorMessage") || "Unknown error";
      return new Response(
        JSON.stringify({ ok: false, error: `Yo API: ${msg}`, raw: xml.slice(0, 1000) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Yo returns one or more <Balance> blocks; sum UGX balances.
    let totalUGX = 0;
    const balanceBlocks = xml.match(/<Balance>[\s\S]*?<\/Balance>/g) || [];
    const balances: Array<{ currency: string; balance: number }> = [];
    for (const blk of balanceBlocks) {
      const currency = extractTag(blk, "Currency") || "UGX";
      const bal = parseFloat(extractTag(blk, "Balance") || "0");
      balances.push({ currency, balance: bal });
      if (currency.toUpperCase() === "UGX") totalUGX += bal;
    }

    // Persist as reconciliation entry + update balance snapshot
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read current pool balance for drift comparison
    const { data: poolRow } = await supabase
      .from("treasury_pool_balance")
      .select("current_balance, last_yo_synced_balance")
      .eq("id", 1)
      .single();

    const drift = totalUGX - Number(poolRow?.current_balance ?? 0);

    // Log reconciliation entry (no balance change — just an audit marker)
    await supabase.rpc("record_treasury_entry", {
      p_direction: drift >= 0 ? "credit" : "debit",
      p_amount: Math.max(Math.abs(drift), 0.01), // RPC requires > 0; for zero drift use minimal placeholder
      p_channel: "yo_payments",
      p_category: "reconciliation",
      p_reference: `YO-SYNC-${Date.now()}`,
      p_related_user_email: null,
      p_related_user_name: null,
      p_description: `Yo balance sync. Yo reports UGX ${totalUGX.toLocaleString()}; pool was UGX ${Number(poolRow?.current_balance ?? 0).toLocaleString()}; drift ${drift >= 0 ? "+" : ""}${drift.toLocaleString()}.`,
      p_performed_by: "system_sync",
      p_metadata: { yo_balances: balances, yo_total_ugx: totalUGX, drift },
    });

    await supabase
      .from("treasury_pool_balance")
      .update({
        last_yo_synced_balance: totalUGX,
        last_yo_synced_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return new Response(
      JSON.stringify({ ok: true, yo_total_ugx: totalUGX, balances, drift }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("sync-yo-balance error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});