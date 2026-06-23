import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const path = "2026/RCP-20260622-4SLA2.pdf";
  const { data, error } = await sb.storage.from("payment-receipts").createSignedUrl(path, 600);
  let probe: any = null;
  if (data?.signedUrl) {
    const r = await fetch(data.signedUrl, { method: "GET" });
    const body = r.headers.get("content-type")?.includes("json") ? await r.text() : `[bytes ${r.headers.get("content-length")}]`;
    probe = { status: r.status, ct: r.headers.get("content-type"), body: body.slice(0, 400) };
  }
  return new Response(JSON.stringify({ data, error, probe }, null, 2), { headers: { "content-type": "application/json" } });
});