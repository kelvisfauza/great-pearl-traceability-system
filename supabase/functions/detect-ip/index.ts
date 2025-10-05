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
    // Get IP from various headers (different proxies use different headers)
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    const xForwardedFor = req.headers.get('x-forwarded-for');
    const xRealIp = req.headers.get('x-real-ip');
    
    // Cloudflare IP is most reliable, then X-Forwarded-For, then X-Real-IP
    let clientIp = cfConnectingIp || 
                   (xForwardedFor ? xForwardedFor.split(',')[0].trim() : null) || 
                   xRealIp || 
                   'unknown';

    console.log('Detected IP:', clientIp);
    console.log('Headers:', {
      cfConnectingIp,
      xForwardedFor,
      xRealIp
    });

    return new Response(
      JSON.stringify({ 
        ip: clientIp,
        headers: {
          cfConnectingIp,
          xForwardedFor,
          xRealIp
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error detecting IP:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
