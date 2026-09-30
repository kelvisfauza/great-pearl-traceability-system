// Lists and downloads the Excel workbooks synced to the admin's OneDrive
// (/GAC-System-Reports/*.xlsx) so admins can access them from inside the app.
//
// GET  (no body)            -> { ok, files: [{ id, name, size, lastModified, webUrl }] }
// POST { action: "download", id } -> streams the .xlsx file bytes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_excel";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const EXCEL_KEY = Deno.env.get("MICROSOFT_EXCEL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FOLDER = "GAC-System-Reports";

function authHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": EXCEL_KEY,
    ...extra,
  };
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user?.email) return null;
  const { data: emp } = await supabase
    .from("employees")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();
  const role = (emp as any)?.role || "";
  if (["Administrator", "Super Admin", "Manager"].includes(role)) return user.email;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY || !EXCEL_KEY) {
      return json({ ok: false, error: "Excel connector secrets are missing" });
    }

    const adminEmail = await requireAdmin(req);
    if (!adminEmail) return json({ ok: false, error: "Not authorized" });

    let action = "list";
    let id = "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      action = String(body.action || "list");
      id = String(body.id || "");
    }

    if (action === "download") {
      if (!/^[A-Za-z0-9!_-]+$/.test(id)) return json({ ok: false, error: "Invalid file id" });
      const r = await fetch(`${GATEWAY}/me/drive/items/${id}/content`, {
        headers: authHeaders(),
        redirect: "follow",
      });
      if (!r.ok) return json({ ok: false, error: `Download failed (${r.status})` });
      const bytes = new Uint8Array(await r.arrayBuffer());
      return new Response(bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    // list
    const r = await fetch(
      `${GATEWAY}/me/drive/root:/${encodeURIComponent(FOLDER)}:/children`,
      { headers: authHeaders() },
    );
    if (r.status === 404) return json({ ok: true, files: [] });
    if (!r.ok) return json({ ok: false, error: `List failed (${r.status}): ${await r.text()}` });
    const j = await r.json();
    const files = (j.value || [])
      .filter((f: any) => f.file && f.name?.toLowerCase().endsWith(".xlsx"))
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size || 0,
        lastModified: f.lastModifiedDateTime || "",
        webUrl: f.webUrl || "",
      }))
      .sort((a: any, b: any) => (a.lastModified < b.lastModified ? 1 : -1));

    return json({ ok: true, files });
  } catch (e: any) {
    console.error("excel-files error:", e);
    return json({ ok: false, error: e.message || String(e) });
  }
});
