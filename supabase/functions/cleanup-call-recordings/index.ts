import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: expired, error } = await admin
      .from("call_recordings")
      .select("id, storage_path, message_id")
      .lt("expires_at", new Date().toISOString())
      .limit(500);
    if (error) throw error;

    const paths = (expired || []).map((r: any) => r.storage_path).filter(Boolean);
    if (paths.length) {
      await admin.storage.from("call-recordings").remove(paths);
    }

    const messageIds = (expired || []).map((r: any) => r.message_id).filter(Boolean);
    if (messageIds.length) {
      await admin.from("messages").delete().in("id", messageIds);
    }

    const ids = (expired || []).map((r: any) => r.id);
    if (ids.length) {
      await admin.from("call_recordings").delete().in("id", ids);
    }

    return new Response(
      JSON.stringify({ ok: true, deleted: ids.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cleanup-call-recordings error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});