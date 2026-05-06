import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["Administrator", "Super Admin"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: callerData, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !callerData?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("name, email, role, status")
      .eq("auth_user_id", callerData.user.id)
      .maybeSingle();

    if (employeeError) {
      throw employeeError;
    }

    if (!employee || employee.status !== "Active" || !ALLOWED_ROLES.has(employee.role)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Treasury access requires an active Administrator or Super Admin account.",
          access: {
            email: employee?.email ?? callerData.user.email ?? null,
            role: employee?.role ?? null,
            status: employee?.status ?? null,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [{ data: balance, error: balanceError }, { data: entries, error: entriesError }, { data: investments, error: investmentsError }] = await Promise.all([
      supabase.from("treasury_pool_balance").select("*").eq("id", 1).maybeSingle(),
      supabase.from("treasury_pool_entries").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("investments").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);

    if (balanceError) throw balanceError;
    if (entriesError) throw entriesError;
    if (investmentsError) throw investmentsError;

    return new Response(
      JSON.stringify({
        ok: true,
        balance,
        entries: entries ?? [],
        investments: investments ?? [],
        access: {
          email: employee.email,
          name: employee.name,
          role: employee.role,
          status: employee.status,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("get-treasury-overview error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Failed to load treasury overview" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});