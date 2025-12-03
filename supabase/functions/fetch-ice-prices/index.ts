import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🌐 Fetching ICE coffee prices from Yahoo Finance...');

    // Fetch Arabica Coffee futures (KC=F)
    const arabicaUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F?interval=1d&range=1d';
    // Fetch Robusta Coffee futures (RC=F)
    const robustaUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/RC=F?interval=1d&range=1d';

    const [arabicaResponse, robustaResponse] = await Promise.all([
      fetch(arabicaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      fetch(robustaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
    ]);

    let iceArabica = null;
    let iceRobusta = null;

    if (arabicaResponse.ok) {
      const arabicaData = await arabicaResponse.json();
      console.log('📊 Arabica response:', JSON.stringify(arabicaData).substring(0, 500));
      
      const arabicaResult = arabicaData?.chart?.result?.[0];
      if (arabicaResult) {
        // Get the most recent price
        const quote = arabicaResult.meta?.regularMarketPrice || 
                      arabicaResult.indicators?.quote?.[0]?.close?.slice(-1)[0];
        if (quote) {
          iceArabica = parseFloat(quote.toFixed(2));
          console.log(`☕ ICE Arabica price: ${iceArabica} cents/lb`);
        }
      }
    } else {
      console.error('❌ Failed to fetch Arabica:', arabicaResponse.status);
    }

    if (robustaResponse.ok) {
      const robustaData = await robustaResponse.json();
      console.log('📊 Robusta response:', JSON.stringify(robustaData).substring(0, 500));
      
      const robustaResult = robustaData?.chart?.result?.[0];
      if (robustaResult) {
        const quote = robustaResult.meta?.regularMarketPrice || 
                      robustaResult.indicators?.quote?.[0]?.close?.slice(-1)[0];
        if (quote) {
          iceRobusta = parseFloat(quote.toFixed(2));
          console.log(`☕ ICE Robusta price: ${iceRobusta} USD/mt`);
        }
      }
    } else {
      console.error('❌ Failed to fetch Robusta:', robustaResponse.status);
    }

    const result = {
      success: true,
      data: {
        iceArabica,
        iceRobusta,
        fetchedAt: new Date().toISOString(),
        source: 'Yahoo Finance'
      }
    };

    console.log('✅ ICE prices fetched:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Error fetching ICE prices:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
