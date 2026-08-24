import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function hash(code: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${code}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ ok: false, error: "Authentication required" });

    const { data: userData } = await createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    }).auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ ok: false, error: "Invalid session" });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "send");
    const targetType = String(body.targetType || "approval");
    const targetId = String(body.targetId || "");
    if (!targetId) return json({ ok: false, error: "targetId is required" });

    // Resolve the admin's own phone (code is sent to the approver, not the payee)
    const { data: emp } = await admin
      .from("employees")
      .select("name, phone, email")
      .ilike("email", user.email || "")
      .maybeSingle();

    if (action === "send") {
      const phone = (body.phone || emp?.phone || "").toString().trim();
      if (!phone) return json({ ok: false, error: "No phone number on your employee profile" });

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const amount = Number(body.amount) || null;

      const { data: row, error: insErr } = await admin
        .from("admin_approval_codes")
        .insert({
          target_type: targetType,
          target_id: targetId,
          requested_by: user.id,
          requested_by_email: user.email,
          code_hash: await hash(code, `${targetType}:${targetId}`),
          phone,
          amount,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();
      if (insErr) return json({ ok: false, error: insErr.message });

      const label = body.label ? String(body.label) : targetType.replace(/_/g, " ");
      const smsText = `Great Agro Coffee approval code: ${code}. Approving ${label}${
        amount ? ` of UGX ${amount.toLocaleString()}` : ""
      }. Valid 10 minutes. Do not share.`;

      // Deliver via BulkSMS.com premium route
      const res = await fetch(`${url}/functions/v1/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anon, Authorization: authHeader },
        body: JSON.stringify({
          phone,
          message: smsText,
          userName: emp?.name || "Administrator",
          recipientEmail: user.email,
          messageType: "admin_approval_code",
        }),
      });
      const smsOk = res.ok;
      if (!smsOk) console.warn("[admin-approval-code] SMS non-OK", res.status, (await res.text()).slice(0, 200));

      const masked = phone.replace(/^(\+?\d{3})\d+(\d{3})$/, "$1*****$2");
      return json({ ok: true, codeId: row.id, phone: masked, sms_sent: smsOk });
    }

    if (action === "verify") {
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code)) return json({ ok: false, error: "Enter the 6-digit code" });

      const { data: rows } = await admin
        .from("admin_approval_codes")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("requested_by", user.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      const row = rows?.[0];
      if (!row) return json({ ok: false, error: "No pending code. Request a new one." });
      if (new Date(row.expires_at).getTime() < Date.now())
        return json({ ok: false, error: "Code expired. Request a new one." });
      if ((row.attempts || 0) >= 5)
        return json({ ok: false, error: "Too many attempts. Request a new code." });

      const expected = await hash(code, `${targetType}:${targetId}`);
      if (expected !== row.code_hash) {
        await admin
          .from("admin_approval_codes")
          .update({ attempts: (row.attempts || 0) + 1 })
          .eq("id", row.id);
        return json({ ok: false, error: "Incorrect code" });
      }

      await admin
        .from("admin_approval_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", row.id);
      return json({ ok: true, verified: true });
    }

    return json({ ok: false, error: `Unknown action '${action}'` });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message || String(e) });
  }
});
