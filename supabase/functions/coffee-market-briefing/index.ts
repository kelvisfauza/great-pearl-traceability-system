const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MarketDirection = "upside" | "downside" | "neutral";

interface CoffeeHeadline {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  sentiment: MarketDirection;
}

interface MarketSnapshot {
  iceArabica?: number | null;
  iceRobusta?: number | null;
  exchangeRate?: number | null;
  localArabica?: number | null;
  localRobusta?: number | null;
  history?: Array<{
    date: string;
    iceArabica?: number | null;
    iceRobusta?: number | null;
    localArabica?: number | null;
    localRobusta?: number | null;
  }>;
}

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q=(coffee%20market%20OR%20arabica%20OR%20robusta%20OR%20coffee%20futures)%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen";

const BULLISH_KEYWORDS = ["shortage", "tight", "surge", "rise", "rally", "weather risk", "frost", "drought", "export demand", "higher", "strong demand", "supply concern"];
const BEARISH_KEYWORDS = ["bumper crop", "pressure", "drop", "fall", "slump", "oversupply", "weak demand", "inventory build", "lower", "bearish", "harvest pace"];

function decodeHtmlEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeHtmlEntities(match[1]) : "";
}

function inferSentiment(title: string): MarketDirection {
  const lower = title.toLowerCase();
  if (BULLISH_KEYWORDS.some((keyword) => lower.includes(keyword))) return "upside";
  if (BEARISH_KEYWORDS.some((keyword) => lower.includes(keyword))) return "downside";
  return "neutral";
}

function parseGoogleNewsRss(xml: string): CoffeeHeadline[] {
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];

  return itemBlocks
    .map((block) => {
      const title = readTag(block, "title");
      const link = readTag(block, "link");
      const publishedAt = readTag(block, "pubDate");
      const source = readTag(block, "source") || "Google News";

      return {
        title,
        link,
        source,
        publishedAt,
        sentiment: inferSentiment(title),
      } satisfies CoffeeHeadline;
    })
    .filter((item) => item.title && item.link)
    .slice(0, 10);
}

function compareDirection(current?: number | null, previous?: number | null): MarketDirection {
  if (current == null || previous == null) return "neutral";
  if (current > previous) return "upside";
  if (current < previous) return "downside";
  return "neutral";
}

function extractJson(content: string) {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1];
  const objectMatch = content.match(/\{[\s\S]*\}/);
  return objectMatch ? objectMatch[0] : content;
}

async function fetchHeadlines() {
  const response = await fetch(GOOGLE_NEWS_RSS, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch coffee headlines [${response.status}]`);
  }

  return parseGoogleNewsRss(await response.text());
}

function fallbackReasons(headlines: CoffeeHeadline[], sentiment: MarketDirection) {
  const selected = headlines.filter((headline) => headline.sentiment === sentiment).slice(0, 3).map((headline) => headline.title);

  if (selected.length > 0) return selected;

  return sentiment === "upside"
    ? [
        "Supply-side risk headlines are limited but the market is still watching export and weather updates.",
        "If inventories stay tight, buyers may bid more aggressively for nearby coffee.",
        "Any disruption in shipments or production can quickly support prices.",
      ]
    : [
        "Demand softness or stronger supply headlines can cap price rallies.",
        "A faster harvest pace can add short-term pressure to physical buying prices.",
        "Macro risk and currency volatility can make buyers more defensive.",
      ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const marketSnapshot: MarketSnapshot = body?.marketSnapshot ?? {};
    const headlines = await fetchHeadlines();

    const previous = marketSnapshot.history?.at?.(-2);
    const arabicaDirection = compareDirection(marketSnapshot.iceArabica, previous?.iceArabica);
    const robustaDirection = compareDirection(marketSnapshot.iceRobusta, previous?.iceRobusta);

    const systemPrompt = `You are a coffee-market TV briefing engine.
Return ONLY valid JSON with this shape:
{
  "summary": string,
  "arabicaDirection": "upside" | "downside" | "neutral",
  "robustaDirection": "upside" | "downside" | "neutral",
  "bullishReasons": string[],
  "bearishReasons": string[]
}
Rules:
- Keep summary under 60 words.
- Reasons must be short and presentation-ready.
- Use headlines and market snapshot only.
- Do not mention missing data unless absolutely necessary.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              marketSnapshot,
              derivedDirection: { arabicaDirection, robustaDirection },
              headlines: headlines.map(({ title, source, publishedAt, sentiment }) => ({ title, source, publishedAt, sentiment })),
            }),
          },
        ],
      }),
    });

    let summary = "Coffee headlines and ICE prices are being combined into a live market briefing for the display room.";
    let bullishReasons = fallbackReasons(headlines, "upside");
    let bearishReasons = fallbackReasons(headlines, "downside");

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData?.choices?.[0]?.message?.content;

      if (content) {
        const parsed = JSON.parse(extractJson(content));
        summary = parsed.summary || summary;
        bullishReasons = Array.isArray(parsed.bullishReasons) && parsed.bullishReasons.length ? parsed.bullishReasons.slice(0, 5) : bullishReasons;
        bearishReasons = Array.isArray(parsed.bearishReasons) && parsed.bearishReasons.length ? parsed.bearishReasons.slice(0, 5) : bearishReasons;
      }
    }

    const response = {
      summary,
      arabicaDirection,
      robustaDirection,
      bullishReasons,
      bearishReasons,
      headlines,
      updatedAt: new Date().toISOString(),
      source: "Google News RSS + Lovable AI",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("coffee-market-briefing error", error);

    return new Response(JSON.stringify({
      summary: "Live coffee-market headlines are temporarily unavailable, but the TV presentation is still active.",
      arabicaDirection: "neutral",
      robustaDirection: "neutral",
      bullishReasons: [
        "Export and weather headlines are being retried.",
        "Short-term supply risks may still support prices.",
        "Nearby demand can keep the market alert.",
      ],
      bearishReasons: [
        "Harvest flow or weak demand can weigh on prices.",
        "Macro volatility may slow buying conviction.",
        "Headline refresh is temporarily delayed.",
      ],
      headlines: [],
      updatedAt: new Date().toISOString(),
      source: "Fallback market briefing",
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
