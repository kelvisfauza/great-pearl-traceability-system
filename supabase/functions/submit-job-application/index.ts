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

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const {
      applicant_name, phone, email, job_applied_for, opening_id,
      gender, date_of_birth, national_id, address,
      education_level, institution, years_experience,
      current_employer, current_position, expected_salary, availability_date,
      cover_letter, referees, terms_accepted,
      cv_base64, cv_filename,
    } = payload || {};

    const name = String(applicant_name || "").trim();
    const tel = String(phone || "").trim();
    const mail = String(email || "").trim();
    const position = String(job_applied_for || "").trim();

    if (!name || name.length > 120) return json({ ok: false, error: "Full name is required" });
    if (!tel || !/^[+0-9\s-]{9,20}$/.test(tel)) return json({ ok: false, error: "A valid phone number is required" });
    if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 255)
      return json({ ok: false, error: "A valid email address is required" });
    if (!position) return json({ ok: false, error: "Please select the position you are applying for" });
    if (!terms_accepted) return json({ ok: false, error: "You must accept the terms and conditions" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Duplicate guard: same email + position within the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dupe } = await admin
      .from("job_applications")
      .select("ref_code")
      .eq("email", mail.toLowerCase())
      .eq("job_applied_for", position)
      .gte("created_at", since)
      .maybeSingle();
    if (dupe) {
      return json({ ok: false, error: `You already applied for this position (Ref: ${dupe.ref_code}). We will contact you.` });
    }

    // Reference code
    const { count } = await admin
      .from("job_applications")
      .select("*", { count: "exact", head: true });
    const refCode = `GPCJA${String((count || 0) + 1).padStart(3, "0")}`;

    // Optional CV upload
    let cvUrl: string | null = null;
    let cvName: string | null = null;
    if (cv_base64 && cv_filename) {
      try {
        const b64 = String(cv_base64).split(",").pop() || "";
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        if (bytes.byteLength > MAX_CV_BYTES) return json({ ok: false, error: "CV file is larger than 5MB" });
        const safe = String(cv_filename).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
        const path = `${refCode}/${Date.now()}-${safe}`;
        const { error: upErr } = await admin.storage.from("job-applications").upload(path, bytes, {
          contentType: safe.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: signed } = await admin.storage.from("job-applications").createSignedUrl(path, 60 * 60 * 24 * 365);
        cvUrl = signed?.signedUrl || null;
        cvName = safe;
      } catch (e) {
        console.error("CV upload failed:", e);
      }
    }

    const { data: app, error } = await admin
      .from("job_applications")
      .insert({
        ref_code: refCode,
        applicant_name: name,
        phone: tel,
        email: mail.toLowerCase(),
        job_applied_for: position,
        opening_id: opening_id || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        national_id: national_id || null,
        address: address || null,
        education_level: education_level || null,
        institution: institution || null,
        years_experience: years_experience !== undefined && years_experience !== "" ? Number(years_experience) : null,
        current_employer: current_employer || null,
        current_position: current_position || null,
        expected_salary: expected_salary !== undefined && expected_salary !== "" ? Number(expected_salary) : null,
        availability_date: availability_date || null,
        cover_letter: cover_letter || null,
        referees: referees || null,
        terms_accepted_at: new Date().toISOString(),
        source: "website",
        cv_url: cvUrl,
        cv_filename: cvName,
        status: "Received",
        created_by: "website",
      })
      .select()
      .single();

    if (error) return json({ ok: false, error: error.message });

    const message = `Dear ${name}, we have RECEIVED your job application for ${position}. Ref: ${refCode}. We will contact you on this number with updates. Great Agro Coffee.`;

    // Applicant SMS (best effort)
    try {
      await admin.functions.invoke("send-sms", {
        body: { phone: tel, message, userName: name, messageType: "job_application" },
      });
    } catch (e) { console.error("SMS failed:", e); }

    // Applicant email (best effort)
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "job-application-status",
          recipientEmail: mail,
          idempotencyKey: `job-received-${app.id}`,
          templateData: {
            applicantName: name,
            refCode,
            position,
            newStatus: "Received",
            statusMessage: message,
          },
        },
      });
    } catch (e) { console.error("Email failed:", e); }

    // HR notification (best effort)
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "general-notification",
          recipientEmail: "operations@greatpearlcoffee.com",
          idempotencyKey: `job-hr-${app.id}`,
          templateData: {
            title: "New Online Job Application",
            message:
              `A new application has been submitted through the website.\n\n` +
              `Reference: ${refCode}\nApplicant: ${name}\nPosition: ${position}\n` +
              `Phone: ${tel}\nEmail: ${mail}\nExperience: ${years_experience || "—"} years\n` +
              `Expected salary: ${expected_salary ? `UGX ${Number(expected_salary).toLocaleString()}` : "—"}\n` +
              `CV attached: ${cvName ? "Yes" : "No"}`,
          },
        },
      });
    } catch (e) { console.error("HR email failed:", e); }

    return json({ ok: true, ref_code: refCode });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message || String(e) });
  }
});
