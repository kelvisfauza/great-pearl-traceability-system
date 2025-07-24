import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY not configured in Supabase secrets');
    }

    console.log('Fetching coffee prices from RapidAPI...');

    // Fetch US Coffee C futures data
    const coffeeResponse = await fetch('https://investing-cryptocurrency-markets.p.rapidapi.com/coins/get-overview', {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'investing-cryptocurrency-markets.p.rapidapi.com',
        'Content-Type': 'application/json'
      }
    });

    if (!coffeeResponse.ok) {
      throw new Error(`RapidAPI request failed: ${coffeeResponse.status}`);
    }

    const coffeeData = await coffeeResponse.json();
    console.log('RapidAPI response:', coffeeData);

    // Extract price data (adjust based on actual API response structure)
    let arabicaPrice = 185.50;
    let robustaPrice = 2450;
    let exchangeRate = 3750;

    // Parse the actual data structure from RapidAPI
    if (coffeeData && coffeeData.data) {
      // Adjust these based on the actual response structure
      arabicaPrice = coffeeData.data.arabica_price || 185.50;
      robustaPrice = coffeeData.data.robusta_price || 2450;
      exchangeRate = coffeeData.data.usd_ugx_rate || 3750;
    }

    // Calculate local prices based on international prices
    const arabicaInfluence = (arabicaPrice - 185.50) * 50;
    const robustaInfluence = (robustaPrice - 2450) * 3;

    const priceData = {
      iceArabica: Math.round(arabicaPrice * 100) / 100,
      robusta: Math.round(robustaPrice),
      exchangeRate: Math.round(exchangeRate),
      drugarLocal: Math.round(8500 + arabicaInfluence),
      wugarLocal: Math.round(8200 + arabicaInfluence * 0.9),
      robustaFaqLocal: Math.round(7800 + robustaInfluence),
      lastUpdated: new Date().toISOString(),
      source: 'RapidAPI'
    };

    console.log('Processed price data:', priceData);

    return new Response(
      JSON.stringify({ success: true, data: priceData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error fetching coffee prices from RapidAPI:', error);
    
    // Return fallback data if API fails
    const fallbackData = {
      iceArabica: 185.50,
      robusta: 2450,
      exchangeRate: 3750,
      drugarLocal: 8500,
      wugarLocal: 8200,
      robustaFaqLocal: 7800,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
      error: error.message
    };

    return new Response(
      JSON.stringify({ success: false, data: fallbackData, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 with fallback data
      }
    )
  }
})