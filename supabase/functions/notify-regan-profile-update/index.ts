import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const phone = '256794884410'
  const message =
    'Dear Regan, your profile at Great Agro Coffee has been updated. Your registered phone number is now 0794884410, which will be used for your salary and all company-related communications. If this was not you, please contact admin immediately.'

  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: {
      phone,
      message,
      userName: 'Regan',
      messageType: 'bypass_sms',
      department: 'HR',
      triggeredBy: 'admin',
    },
  })

  return new Response(JSON.stringify({ ok: !error, data, error: error?.message || null }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})