import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { form_number, image_base64, content_type, file_name } = await req.json();
    if (!form_number || !image_base64) {
      return json({ ok: false, error: "form_number and image_base64 required" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: form, error: formErr } = await supabase
      .from("dispatch_monitoring_forms")
      .select("id, form_number")
      .eq("form_number", String(form_number).toUpperCase())
      .maybeSingle();
    if (formErr || !form) return json({ ok: false, error: "Dispatch form not found" });

    const cleaned = String(image_base64).replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
    const mime = content_type || "image/jpeg";
    const ext = mime.includes("pdf") ? "pdf" : mime.includes("png") ? "png" : "jpg";
    const path = `dispatch-forms/${form.form_number}_${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("dispatch-attachments")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) return json({ ok: false, error: `Upload failed: ${upErr.message}` });

    // Store the durable storage path — viewers mint a fresh signed URL on demand.
    // (A signed URL saved here would expire and break the report link.)
    const attachmentUrl = path;

    const attachmentName = file_name || `${form.form_number}.${ext}`;

    const { error: updErr } = await supabase
      .from("dispatch_monitoring_forms")
      .update({
        attachment_path: attachmentUrl,
        attachment_name: attachmentName,
        attachment_uploaded_at: new Date().toISOString(),
        status: "scanned",
      })
      .eq("id", form.id);
    if (updErr) return json({ ok: false, error: `Save failed: ${updErr.message}` });

    return json({ ok: true, attachment_url: attachmentUrl, attachment_name: attachmentName });
  } catch (err) {
    return json({ ok: false, error: String((err as any)?.message || err) });
  }
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
