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

  const workEmail = "onesmusrubambura@greatpearlcoffee.com";
  const personalEmail = "orubambura@gmail.com";
  const password = "Onesmus@2026";
  const name = "Rubambura Kakuhi Onesmus";
  const phone = "0778479944";

  try {
    // 1. Locate existing auth user by either personal or work email
    const { data: list } = await admin.auth.admin.listUsers();
    const existingAuth = list.users.find(
      (u) =>
        u.email?.toLowerCase() === personalEmail.toLowerCase() ||
        u.email?.toLowerCase() === workEmail.toLowerCase()
    );

    let authUserId = existingAuth?.id;
    if (authUserId) {
      // Update to work email + reset password
      await admin.auth.admin.updateUserById(authUserId, {
        email: workEmail,
        password,
        email_confirm: true,
      });
    } else {
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: workEmail,
        password,
        email_confirm: true,
        user_metadata: { name, role: "User" },
      });
      if (authErr) {
        return new Response(JSON.stringify({ ok: false, error: authErr.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authUserId = authData.user?.id;
    }

    // 2. Upsert employee record (match by either email)
    const { data: existing } = await admin
      .from("employees")
      .select("id")
      .or(`email.eq.${personalEmail},email.eq.${workEmail}`)
      .maybeSingle();

    let employee;
    if (existing) {
      const { data } = await admin
        .from("employees")
        .update({ auth_user_id: authUserId, email: workEmail, status: "Active" })
        .eq("id", existing.id)
        .select()
        .single();
      employee = data;
    } else {
      const { data, error: empErr } = await admin
        .from("employees")
        .insert({
          name,
          email: workEmail,
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
      .eq("email", personalEmail);

    // 4. Send credentials to personal email + SMS
    const message = `Welcome to Great Agro Coffee!\n\nYour login has been created.\n\nLogin email: ${workEmail}\nTemporary password: ${password}\n\nPlease log in at https://greatpearlcoffeesystem.site and change your password immediately.\n\n— Great Agro Coffee HR`;

    const results = await Promise.allSettled([
      admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "general-notification",
          recipientEmail: personalEmail,
          idempotencyKey: `onesmus-credentials-${Date.now()}`,
          templateData: {
            title: "Your Great Agro Coffee Login",
            heading: `Welcome, ${name}`,
            message,
            recipientName: name,
          },
        },
      }),
      admin.functions.invoke("send-sms", {
        body: {
          to: phone,
          message: `Great Agro: Your login email is ${workEmail}, temp password: ${password}. Change it on first login.`,
          type: "account_credentials",
        },
      }),
    ]);

    const notify = {
      email: results[0].status,
      sms: results[1].status,
    };

    return new Response(
      JSON.stringify({ ok: true, workEmail, personalEmail, password, authUserId, employee, notify }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});