import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/**
 * Restricts an edge function to trusted callers:
 *  - scheduled jobs / DB triggers sending the vault-backed x-internal-secret header,
 *  - other edge functions calling with the service-role key,
 *  - a signed-in Admin / HR / Finance staff member (manual runs from the app).
 * Returns null when allowed, or a 401/403 Response to return immediately.
 */
export async function requireInternalOrAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const deny = (status: number, error: string) =>
    new Response(JSON.stringify({ ok: false, error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const secret = req.headers.get("x-internal-secret");
  if (secret) {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data } = await admin.rpc("verify_internal_edge_secret", { p_secret: secret });
    if (data === true) return null;
    return deny(401, "Unauthorized");
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny(401, "Unauthorized");
  if (token === serviceKey) return null;

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u, error } = await userClient.auth.getUser(token);
  if (error || !u?.user) return deny(401, "Unauthorized");
  const { data: ok } = await userClient.rpc("is_admin_hr_or_finance");
  if (ok === true) return null;
  const { data: ok2 } = await userClient.rpc("is_current_user_admin");
  if (ok2 === true) return null;
  return deny(403, "Forbidden");
}

export interface StaffCaller {
  internal: boolean; // scheduler / service-role / internal secret
  userId: string | null;
  email: string | null;
  isAdmin: boolean; // Admin / HR / Finance
}

/**
 * Allows trusted internal callers or any signed-in, non-disabled employee.
 * Returns the caller identity, or a Response to return immediately.
 */
export async function requireStaff(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<StaffCaller | Response> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const deny = (status: number, error: string) =>
    new Response(JSON.stringify({ ok: false, error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const secret = req.headers.get("x-internal-secret");
  if (secret) {
    const { data } = await admin.rpc("verify_internal_edge_secret", { p_secret: secret });
    if (data === true) return { internal: true, userId: null, email: null, isAdmin: true };
    return deny(401, "Unauthorized");
  }
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny(401, "Please sign in again.");
  if (token === serviceKey) return { internal: true, userId: null, email: null, isAdmin: true };

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u, error } = await userClient.auth.getUser(token);
  if (error || !u?.user?.email) return deny(401, "Please sign in again.");
  const email = u.user.email.toLowerCase();
  const { data: emp } = await admin
    .from("employees").select("id, disabled").ilike("email", email).maybeSingle();
  if (!emp || emp.disabled === true) return deny(403, "Forbidden");
  const { data: a1 } = await userClient.rpc("is_admin_hr_or_finance");
  const { data: a2 } = a1 === true ? { data: true } : await userClient.rpc("is_current_user_admin");
  return { internal: false, userId: u.user.id, email, isAdmin: a1 === true || a2 === true };
}
