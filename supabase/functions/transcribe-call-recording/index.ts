import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_IDS = ["00b188fc-73fe-4ee7-9fe9-956ab2faa6ec"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function transcribeWithLovableAI(
  bytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  // base64 encode
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);

  // Gemini accepts audio/webm; if it's mp4 use audio/mp4
  const audioMime = mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a transcription engine. Output ONLY the verbatim transcript of the audio. Use plain text. Label speakers as Speaker 1, Speaker 2, etc. when multiple voices are present. No commentary, no preface, no summary.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this call recording." },
              {
                type: "input_audio",
                input_audio: { data: b64, format: audioMime.split("/")[1] },
              },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim?.() || "";
}

async function getOrCreateDirectConversation(
  admin: ReturnType<typeof createClient>,
  userA: string,
  userB: string,
): Promise<string> {
  const { data: existing } = await admin
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("user_id", [userA, userB]);

  if (existing && existing.length > 0) {
    const counts: Record<string, Set<string>> = {};
    for (const row of existing as any[]) {
      const set = counts[row.conversation_id] ||= new Set();
      set.add(row.user_id);
    }
    for (const [cid, set] of Object.entries(counts)) {
      if (set.has(userA) && set.has(userB)) return cid;
    }
  }

  const { data: conv, error: ce } = await admin
    .from("conversations")
    .insert({ type: "direct", created_by: userA })
    .select("id")
    .single();
  if (ce) throw ce;

  const { error: pe } = await admin.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: userA },
    { conversation_id: conv.id, user_id: userB },
  ]);
  if (pe) throw pe;
  return conv.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Unauthorized" }, 200);

    const body = await req.json();
    const {
      call_id,
      storage_path,
      duration_seconds = 0,
      mime_type = "audio/webm",
      host_name,
      title,
    } = body || {};

    if (!call_id || !storage_path) {
      return json({ ok: false, error: "Missing call_id or storage_path" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is the host of the call
    const { data: callRow } = await admin
      .from("group_calls")
      .select("id, host_id, title")
      .eq("id", call_id)
      .maybeSingle();
    if (!callRow) return json({ ok: false, error: "Call not found" });
    if (callRow.host_id !== user.id) {
      return json({ ok: false, error: "Only the host can record" });
    }

    // Insert recording row (processing)
    const { data: recRow, error: recErr } = await admin
      .from("call_recordings")
      .insert({
        call_id,
        host_id: user.id,
        storage_path,
        duration_seconds,
        mime_type,
        status: "processing",
      })
      .select("id")
      .single();
    if (recErr) throw recErr;

    // Download audio for transcription
    const { data: blob, error: dlErr } = await admin.storage
      .from("call-recordings")
      .download(storage_path);
    if (dlErr) throw dlErr;
    const bytes = new Uint8Array(await blob.arrayBuffer());

    let transcript = "";
    let transcriptError: string | null = null;
    try {
      transcript = await transcribeWithLovableAI(bytes, mime_type);
    } catch (e) {
      transcriptError = e instanceof Error ? e.message : String(e);
      console.error("Transcription failed:", transcriptError);
    }

    // Signed URL (24h) for playback in chat
    const { data: signed } = await admin.storage
      .from("call-recordings")
      .createSignedUrl(storage_path, 60 * 60 * 24);
    const signedUrl = signed?.signedUrl || "";

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString();

    const metadata = {
      call_id,
      storage_path,
      duration_seconds,
      mime_type,
      transcript,
      transcript_error: transcriptError,
      signed_url: signedUrl,
      expires_at: expiresAt,
      title: title || callRow.title || "Group call",
      fileName: `call-${call_id}.${mime_type.includes("mp4") ? "m4a" : "webm"}`,
      fileSize: bytes.length,
    };

    // Deliver to host + all super admins (excluding host if host is admin)
    const recipients = new Set<string>(SUPER_ADMIN_IDS);
    recipients.delete(user.id);

    const deliveredMessages: string[] = [];
    for (const adminId of recipients) {
      const convId = await getOrCreateDirectConversation(
        admin,
        user.id,
        adminId,
      );
      const { data: msg, error: msgErr } = await admin
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          sender_name: host_name || "Host",
          content: signedUrl,
          type: "call_recording",
          metadata,
        })
        .select("id")
        .single();
      if (msgErr) {
        console.error("Message insert failed:", msgErr);
        continue;
      }
      deliveredMessages.push(msg.id);
    }

    // If host IS the only super admin, still create a self-record by posting
    // into a "Notes to self" style: skip — recording row remains accessible.

    await admin
      .from("call_recordings")
      .update({
        transcript,
        status: transcriptError ? "transcript_failed" : "ready",
        message_id: deliveredMessages[0] || null,
      })
      .eq("id", recRow.id);

    return json({
      ok: true,
      recording_id: recRow.id,
      transcript_preview: transcript.slice(0, 200),
      delivered_to: deliveredMessages.length,
    });
  } catch (e) {
    console.error("transcribe-call-recording error:", e);
    return json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});