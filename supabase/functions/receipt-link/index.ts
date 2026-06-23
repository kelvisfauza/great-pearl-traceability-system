import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Short, public redirect URL for payment receipts.
// Usage: GET /functions/v1/receipt-link?ref=RCP-20260622-4SLA2
// Looks up the PDF in the `payment-receipts` bucket and 302-redirects
// to a freshly-signed download URL valid for 24 hours. Used so SMS/email
// can carry a short link instead of a ~400-char signed URL that gets
// truncated or mangled in transit.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const refRaw = (url.searchParams.get("ref") || "").trim();
    // sanitize: only allow our reference format chars
    const ref = refRaw.replace(/[^A-Za-z0-9._-]/g, "");
    if (!ref) {
      return new Response("Missing receipt reference", { status: 400, headers: corsHeaders });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // References look like RCP-YYYYMMDD-XXXXX and the file is stored at
    // <year>/<ref>.pdf. Try the current year first, then list and search
    // any folder as a fallback.
    const candidatePaths: string[] = [];
    const m = ref.match(/^RCP-(\d{4})\d{4}-/);
    if (m) candidatePaths.push(`${m[1]}/${ref}.pdf`);
    const currentYear = new Date().getUTCFullYear();
    if (!candidatePaths.includes(`${currentYear}/${ref}.pdf`)) {
      candidatePaths.push(`${currentYear}/${ref}.pdf`);
    }

    let signedUrl: string | null = null;
    for (const p of candidatePaths) {
      const { data, error } = await sb.storage
        .from("payment-receipts")
        .createSignedUrl(p, 60 * 60 * 24); // 24h
      if (!error && data?.signedUrl) {
        // probe HEAD to ensure file exists
        const head = await fetch(data.signedUrl, { method: "HEAD" });
        if (head.ok) { signedUrl = data.signedUrl; break; }
      }
    }

    // Last-resort: scan recent year folders for the file name
    if (!signedUrl) {
      for (let y = currentYear; y >= currentYear - 2; y--) {
        const { data: list } = await sb.storage
          .from("payment-receipts")
          .list(String(y), { limit: 1000, search: ref });
        const hit = list?.find((f: any) => f.name === `${ref}.pdf`);
        if (hit) {
          const { data } = await sb.storage
            .from("payment-receipts")
            .createSignedUrl(`${y}/${ref}.pdf`, 60 * 60 * 24);
          if (data?.signedUrl) { signedUrl = data.signedUrl; break; }
        }
      }
    }

    if (!signedUrl) {
      return new Response("Receipt not found", { status: 404, headers: corsHeaders });
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: signedUrl, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("receipt-link error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});