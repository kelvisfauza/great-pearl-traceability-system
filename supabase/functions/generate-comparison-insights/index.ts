import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { comparisonType, metric1Name, metric1Value, metric2Name, metric2Value, difference, percentageDiff, startDate, endDate } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a business analyst for a coffee processing and export company. Analyze comparison data and provide professional, actionable business insights. Keep your response concise (2-3 paragraphs max) and focused on:
- Key observations about the metrics
- Business implications
- Specific recommendations or areas of concern
- Breakdown of contributing factors

Write in a professional, analytical tone as if you're a senior business analyst. Do not mention that you are AI or that this is AI-generated. Write as if you are part of the company's analysis team.`;

    const userPrompt = `Analyze this comparison for the period ${startDate} to ${endDate}:

Comparison Type: ${comparisonType}
${metric1Name}: ${metric1Value.toLocaleString()}
${metric2Name}: ${metric2Value.toLocaleString()}
Difference: ${difference.toLocaleString()}
Percentage Difference: ${percentageDiff.toFixed(2)}%

Provide a detailed breakdown with business insights, observations, and recommendations. Focus on what these numbers mean for the business operations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("Failed to generate insights");
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content;

    if (!insights) {
      throw new Error("No insights generated");
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
