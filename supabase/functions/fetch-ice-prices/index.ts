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

    // Use chart API - KC=F is Arabica Coffee front-month contract
    const arabicaUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F?interval=1m&range=1d';
    // RC=F for Robusta Coffee  
    const robustaUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/RC=F?interval=1m&range=1d';

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const [arabicaResponse, robustaResponse] = await Promise.all([
      fetch(arabicaUrl, { headers }),
      fetch(robustaUrl, { headers })
    ]);

    let iceArabica = null;
    let iceRobusta = null;

    if (arabicaResponse.ok) {
      const arabicaData = await arabicaResponse.json();
      console.log('📊 Arabica meta:', JSON.stringify(arabicaData?.chart?.result?.[0]?.meta).substring(0, 300));
      
      const meta = arabicaData?.chart?.result?.[0]?.meta;
      // regularMarketPrice is the current live price
      const price = meta?.regularMarketPrice;
      if (price) {
        iceArabica = parseFloat(price.toFixed(2));
        console.log(`☕ ICE Arabica price: ${iceArabica} cents/lb (symbol: ${meta?.symbol})`);
      }
    } else {
      console.error('❌ Failed to fetch Arabica:', arabicaResponse.status);
    }

    if (robustaResponse.ok) {
      const robustaData = await robustaResponse.json();
      console.log('📊 Robusta meta:', JSON.stringify(robustaData?.chart?.result?.[0]?.meta).substring(0, 300));
      
      const meta = robustaData?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      if (price) {
        iceRobusta = parseFloat(price.toFixed(2));
        console.log(`☕ ICE Robusta price: ${iceRobusta} USD/mt (symbol: ${meta?.symbol})`);
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
