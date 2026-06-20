import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_code, image_base64, content_type } = await req.json();
    if (!session_code || !image_base64) {
      return json({ ok: false, error: "session_code and image_base64 required" }, 200);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate session
    const { data: session, error: sessErr } = await supabase
      .from("weighbridge_scan_sessions")
      .select("id, status, expires_at")
      .eq("session_code", session_code)
      .maybeSingle();
    if (sessErr || !session) return json({ ok: false, error: "Invalid session" }, 200);
    if (session.status !== "active" || new Date(session.expires_at) < new Date()) {
      return json({ ok: false, error: "Session expired" }, 200);
    }

    // Decode base64 (strip data URI prefix if present)
    const cleaned = image_base64.replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
    const mime = content_type || "image/jpeg";
    const ext = mime.includes("png") ? "png" : "jpg";
    const fileName = `weighbridge/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("dispatch-attachments")
      .upload(fileName, bytes, { contentType: mime, upsert: false });
    if (upErr) return json({ ok: false, error: `Upload failed: ${upErr.message}` }, 200);

    // Bucket is private — store the path and issue a signed URL for immediate use
    const { data: signed } = await supabase.storage
      .from("dispatch-attachments")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days
    const photoUrl = signed?.signedUrl || fileName;

    const { error: insErr } = await supabase
      .from("weighbridge_scanned_tickets")
      .insert({
        session_id: session.id,
        qr_data: `auto-captured-${Date.now()}`,
        photo_url: photoUrl,
      });
    if (insErr) return json({ ok: false, error: `Insert failed: ${insErr.message}` }, 200);

    return json({ ok: true, photo_url: photoUrl }, 200);
  } catch (err) {
    return json({ ok: false, error: String((err as any)?.message || err) }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}