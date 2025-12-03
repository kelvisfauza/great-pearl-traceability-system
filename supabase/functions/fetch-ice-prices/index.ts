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

    // Use quote API for real-time prices - KC=F is Arabica Coffee front-month
    const arabicaUrl = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/KC=F?modules=price';
    // RC=F for Robusta Coffee
    const robustaUrl = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/RC=F?modules=price';

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    };

    const [arabicaResponse, robustaResponse] = await Promise.all([
      fetch(arabicaUrl, { headers }),
      fetch(robustaUrl, { headers })
    ]);

    let iceArabica = null;
    let iceRobusta = null;

    if (arabicaResponse.ok) {
      const arabicaData = await arabicaResponse.json();
      console.log('📊 Arabica response:', JSON.stringify(arabicaData).substring(0, 500));
      
      const price = arabicaData?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      if (price) {
        iceArabica = parseFloat(price.toFixed(2));
        console.log(`☕ ICE Arabica price: ${iceArabica} cents/lb`);
      }
    } else {
      console.error('❌ Failed to fetch Arabica:', arabicaResponse.status);
      const errorText = await arabicaResponse.text();
      console.error('Error details:', errorText.substring(0, 200));
    }

    if (robustaResponse.ok) {
      const robustaData = await robustaResponse.json();
      console.log('📊 Robusta response:', JSON.stringify(robustaData).substring(0, 500));
      
      const price = robustaData?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      if (price) {
        iceRobusta = parseFloat(price.toFixed(2));
        console.log(`☕ ICE Robusta price: ${iceRobusta} USD/mt`);
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
