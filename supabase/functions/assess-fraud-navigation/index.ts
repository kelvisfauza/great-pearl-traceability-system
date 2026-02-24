import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NavigationVisit = {
  path: string;
  timestamp: number;
};

type AIResponse = {
  shouldLock?: boolean;
  confidence?: number;
  reason?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();

    const userId = String(body?.userId || "");
    const userEmail = String(body?.userEmail || "");
    const userName = String(body?.userName || "User");
    const threshold = Number(body?.threshold || 4);
    const windowMs = Number(body?.windowMs || 20000);

    const visits: NavigationVisit[] = Array.isArray(body?.visits)
      ? body.visits
          .filter(
            (v: unknown): v is NavigationVisit =>
              typeof v === "object" &&
              v !== null &&
              typeof (v as NavigationVisit).path === "string" &&
              typeof (v as NavigationVisit).timestamp === "number"
          )
          .slice(-12)
      : [];

    if (!userId || visits.length < threshold) {
      return new Response(
        JSON.stringify({ shouldLock: false, confidence: 0, reason: "Insufficient suspicious navigation evidence" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const simplifiedVisits = visits.map((visit) => ({
      path: visit.path,
      secondsAgo: Math.max(0, Math.round((Date.now() - visit.timestamp) / 1000)),
    }));

    const uniquePaths = new Set(visits.map((v) => v.path)).size;

    const prompt = `You are a fraud risk reviewer for loyalty rewards.

User:
- ID: ${userId}
- Name: ${userName}
- Email: ${userEmail}

Rule trigger context:
- Threshold reached: ${threshold} page changes
- Time window: ${Math.round(windowMs / 1000)} seconds
- Unique paths in trigger window: ${uniquePaths}

Recent navigation sequence (newest last):
${JSON.stringify(simplifiedVisits, null, 2)}

Task:
Decide if this is likely intentional reward abuse OR normal working navigation.
Be strict about evidence. If not clearly fraudulent, do NOT lock.

Respond with JSON only:
{
  "shouldLock": boolean,
  "confidence": number,
  "reason": "short reason"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You classify navigation fraud risk. Return valid JSON only. Prefer false positives avoidance: if uncertain, set shouldLock to false.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up Lovable AI usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("AI fraud evaluation failed:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ shouldLock: false, confidence: 0, reason: "AI evaluation unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content || "{}";

    let parsed: AIResponse = {};

    try {
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI fraud response:", parseError, content);
      parsed = { shouldLock: false, confidence: 0, reason: "Unparseable AI response" };
    }

    const confidence = Number(parsed.confidence ?? 0);
    const shouldLock = Boolean(parsed.shouldLock) && confidence >= 70;

    return new Response(
      JSON.stringify({
        shouldLock,
        confidence,
        reason: parsed.reason || "No reason provided",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("assess-fraud-navigation error:", error);
    return new Response(
      JSON.stringify({ shouldLock: false, confidence: 0, reason: "Unhandled fraud assessment error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
