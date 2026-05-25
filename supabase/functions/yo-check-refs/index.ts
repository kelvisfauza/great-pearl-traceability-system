import { resolveYoTransactionStatus } from "../_shared/yo-status.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { refs } = await req.json();
  const u = Deno.env.get("YO_API_USERNAME")!;
  const p = Deno.env.get("YO_API_PASSWORD")!;
  const out: any[] = [];
  for (const r of refs) {
    const res = await resolveYoTransactionStatus(u, p, [r]);
    out.push({ ref: r, ...res });
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});