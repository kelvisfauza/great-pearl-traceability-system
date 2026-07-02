import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = "orubambura@gmail.com";
  const password = "Onesmus@2026";
  const name = "Rubambura Kakuhi Onesmus";
  const phone = "0778479944";

  try {
    // 1. Create auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "User" },
    });

    let authUserId = authData?.user?.id;
    if (authErr) {
      if (!authErr.message?.toLowerCase().includes("already")) {
        return new Response(JSON.stringify({ ok: false, error: authErr.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Fetch existing user id
      const { data: list } = await admin.auth.admin.listUsers();
      authUserId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
    }

    // 2. Upsert employee record
    const { data: existing } = await admin
      .from("employees")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let employee;
    if (existing) {
      const { data } = await admin
        .from("employees")
        .update({ auth_user_id: authUserId, status: "Active" })
        .eq("id", existing.id)
        .select()
        .single();
      employee = data;
    } else {
      const { data, error: empErr } = await admin
        .from("employees")
        .insert({
          name,
          email,
          phone,
          position: "Junior Quality Control Officer",
          department: "Quality Control",
          role: "User",
          salary: 0,
          permissions: ["Quality Control"],
          status: "Active",
          join_date: new Date().toISOString(),
          auth_user_id: authUserId,
        })
        .select()
        .single();
      if (empErr) {
        return new Response(JSON.stringify({ ok: false, error: empErr.message, authUserId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      employee = data;
    }

    // 3. Mark job application as onboarded
    await admin
      .from("job_applications")
      .update({ status: "Onboarded", notes: "Account created; junior quality assistant." })
      .eq("email", email);

    return new Response(
      JSON.stringify({ ok: true, email, password, authUserId, employee }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});