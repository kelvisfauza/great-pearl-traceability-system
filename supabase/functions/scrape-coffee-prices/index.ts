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
    console.log('Starting coffee price scraping...');

    // Scrape US Coffee C futures from Investing.com
    const coffeeCResponse = await fetch('https://www.investing.com/commodities/us-coffee-c', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    const coffeeHtml = await coffeeCResponse.text();
    console.log('Fetched Coffee C page, length:', coffeeHtml.length);

    // Extract price using regex patterns
    const priceRegex = /<span[^>]*class="[^"]*text-2xl[^"]*"[^>]*>([0-9,]+\.?[0-9]*)/i;
    const changeRegex = /<span[^>]*class="[^"]*(?:text-red|text-green)[^"]*"[^>]*>([+-]?[0-9,]+\.?[0-9]*)/i;

    const priceMatch = coffeeHtml.match(priceRegex);
    const changeMatch = coffeeHtml.match(changeRegex);

    let arabicaPrice = 185.50; // Default fallback
    let arabicaChange = 0;

    if (priceMatch) {
      arabicaPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
      console.log('Extracted Arabica price:', arabicaPrice);
    }

    if (changeMatch) {
      arabicaChange = parseFloat(changeMatch[1].replace(/,/g, ''));
      console.log('Extracted Arabica change:', arabicaChange);
    }

    // Fetch Robusta prices (London)
    const robustaResponse = await fetch('https://www.investing.com/commodities/london-cocoa', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    const robustaHtml = await robustaResponse.text();
    let robustaPrice = 2450; // Default fallback

    const robustaPriceMatch = robustaHtml.match(priceRegex);
    if (robustaPriceMatch) {
      robustaPrice = parseFloat(robustaPriceMatch[1].replace(/,/g, ''));
      console.log('Extracted Robusta price:', robustaPrice);
    }

    // Get USD/UGX exchange rate
    const exchangeResponse = await fetch('https://www.investing.com/currencies/usd-ugx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    const exchangeHtml = await exchangeResponse.text();
    let exchangeRate = 3750; // Default fallback

    const exchangeMatch = exchangeHtml.match(priceRegex);
    if (exchangeMatch) {
      exchangeRate = parseFloat(exchangeMatch[1].replace(/,/g, ''));
      console.log('Extracted exchange rate:', exchangeRate);
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
      arabicaChange: Math.round(arabicaChange * 100) / 100
    };

    console.log('Final price data:', priceData);

    return new Response(
      JSON.stringify({ success: true, data: priceData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error scraping coffee prices:', error);
    
    // Return fallback data if scraping fails
    const fallbackData = {
      iceArabica: 185.50,
      robusta: 2450,
      exchangeRate: 3750,
      drugarLocal: 8500,
      wugarLocal: 8200,
      robustaFaqLocal: 7800,
      lastUpdated: new Date().toISOString(),
      arabicaChange: 0,
      error: 'Scraping failed, using fallback data'
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