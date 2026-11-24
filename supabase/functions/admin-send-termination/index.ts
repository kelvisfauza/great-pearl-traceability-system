import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This dated, one-off sender is retired. Its embedded token must never
// authorize new notices or bypass the normal employee-management workflow.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;
  return new Response(JSON.stringify({
    ok: false,
    error: 'This one-off notification action is retired. Use the employee management workflow.',
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
