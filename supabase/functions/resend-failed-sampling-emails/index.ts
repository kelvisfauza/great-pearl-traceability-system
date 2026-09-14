import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit) || 100, 150);

    // Find failed sampling-order emails that have not since been resent successfully.
    const { data: failed, error } = await supabase
      .from("sent_emails_log")
      .select("id, idempotency_key, recipient_email, subject, metadata")
      .eq("status", "failed")
      .ilike("idempotency_key", "sampling-order-%")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) return json({ ok: false, error: error.message });
    if (!failed || failed.length === 0) return json({ ok: true, resent: 0, results: [] });

    const results: any[] = [];
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let first = true;

    const run = async () => {
      for (const row of failed) {
      const meta = (row.metadata || {}) as any;
      if (!meta.message || !meta.subject) {
        results.push({ email: row.recipient_email, ok: false, error: "missing metadata" });
        continue;
      }

      // Skip if a retry for this exact email already succeeded.
      const retryKey = `${row.idempotency_key}-resend`;
      const { data: already } = await supabase
        .from("sent_emails_log")
        .select("id")
        .eq("idempotency_key", retryKey)
        .eq("status", "sent")
        .maybeSingle();
      if (already) {
        results.push({ email: row.recipient_email, ok: true, skipped: "already resent" });
        continue;
      }

      if (!first) await pause(8000); // stay under the provider rate limit
      first = false;

      try {
        const { data, error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "general-notification",
            recipientEmail: row.recipient_email,
            idempotencyKey: retryKey,
            templateData: {
              subject: meta.subject,
              title: meta.title || "Notification",
              recipientName: meta.recipientName || "Team",
              message: meta.message,
              ctaUrl: meta.ctaUrl || undefined,
              ctaLabel: meta.ctaLabel || undefined,
            },
          },
        });
        const ok = !sendErr && !(data as any)?.error;
        results.push({ email: row.recipient_email, ok, error: sendErr?.message || (data as any)?.error });

        if (ok) {
          // Mark the original failed row so it isn't picked up again.
          await supabase
            .from("sent_emails_log")
            .update({ status: "resent" })
            .eq("id", row.id);
        }
      } catch (e) {
        results.push({ email: row.recipient_email, ok: false, error: String((e as any)?.message || e) });
      }
      }
    };

    // Process in the background so the HTTP call returns immediately and
    // long batches aren't killed by gateway timeouts.
    (globalThis as any).EdgeRuntime?.waitUntil(run());

    return json({ ok: true, queued: failed.length });
  } catch (err) {
    return json({ ok: false, error: String((err as any)?.message || err) });
  }
});
