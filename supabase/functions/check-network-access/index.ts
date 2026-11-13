import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Network access is open to all staff. This endpoint no longer looks up
// employee records or logs who asked, so it reveals nothing about accounts.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const clientIp = req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') || 'unknown';
  return new Response(
    JSON.stringify({ allowed: true, reason: 'Access granted', ip: clientIp }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
