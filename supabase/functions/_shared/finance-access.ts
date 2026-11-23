import { createClient } from "npm:@supabase/supabase-js@2";

export function financeAccessAllowed(employee: { status?: string; disabled?: boolean; permissions?: string[] } | null, roles: string[]): boolean {
  if (!employee || employee.disabled === true || employee.status?.toLowerCase() !== "active") return false;
  return roles.some(role => ["Administrator", "Super Admin", "admin", "finance_manager", "Finance", "Finance Manager"].includes(role)) ||
    (employee.permissions || []).some(permission => ["Finance", "Finance Management", "Finance Approval", "Finance:approve", "Finance:process"].includes(permission));
}

/** Finance endpoints authenticate once; unavailable identity/permission reads never masquerade as denied access. */
export async function requireFinanceCaller(req: Request, corsHeaders: Record<string, string>, factory = createClient) {
  const reply = (status: number, error: string) => new Response(JSON.stringify({ ok: false, error }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return reply(503, "Finance access is temporarily unavailable. Please try again.");
  const db = factory(url, serviceKey, { auth: { persistSession: false } });
  const internalSecret = req.headers.get("x-internal-secret");
  if (internalSecret) {
    const { data, error } = await db.rpc("verify_internal_edge_secret", { p_secret: internalSecret });
    if (error) return reply(503, "Finance access could not be checked. Please try again.");
    return data === true ? { internal: true, user: null } : reply(401, "Unauthorized");
  }
  const header = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+/i.test(header)) return reply(401, "Please sign in again.");
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === anonKey) return reply(401, "Please sign in again.");
  if (token === serviceKey) return { internal: true, user: null };
  const caller = factory(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: header } } });
  const { data: auth, error: authError } = await caller.auth.getClaims(token);
  if (authError || !auth?.claims?.sub || !auth.claims.email) {
    if (authError && (authError.name === "AuthRetryableFetchError" || ("status" in authError && Number(authError.status) >= 500))) return reply(503, "Sign-in could not be checked. Please try again.");
    return reply(401, "Please sign in again.");
  }
  const user = { id: String(auth.claims.sub), email: String(auth.claims.email).toLowerCase() };
  const [{ data: employee, error: employeeError }, { data: roles, error: roleError }] = await Promise.all([
    db.from("employees").select("status, disabled, permissions").ilike("email", user.email).maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (employeeError || roleError) return reply(503, "Finance permissions could not be checked. Please try again.");
  if (!financeAccessAllowed(employee, (roles || []).map(row => row.role))) return reply(403, "Only active Finance staff and administrators can use this action.");
  return { internal: false, user };
}