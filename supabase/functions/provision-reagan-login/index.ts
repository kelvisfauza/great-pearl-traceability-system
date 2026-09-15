import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-off provisioning for the trainee account only. Hardcoded target, idempotent.
const TARGET_EMAIL = 'info.rhiganmuhindo@gmail.com'
const TEMP_PASSWORD = 'Trainee@Reagan2026'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { data: emp } = await admin
      .from('employees')
      .select('id, name, email, auth_user_id')
      .eq('email', TARGET_EMAIL)
      .maybeSingle()

    if (!emp) {
      return new Response(JSON.stringify({ ok: false, error: 'Employee record not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: list } = await admin.auth.admin.listUsers()
    let authUser = list?.users?.find((u: any) => (u.email || '').toLowerCase() === TARGET_EMAIL)

    if (!authUser) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: TARGET_EMAIL,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: { name: emp.name, role: 'Trainee' },
      })
      if (createErr) throw createErr
      authUser = created.user
    } else {
      await admin.auth.admin.updateUserById(authUser.id, { password: TEMP_PASSWORD })
    }

    await admin.from('employees').update({ auth_user_id: authUser!.id }).eq('id', emp.id)

    return new Response(JSON.stringify({ ok: true, email: TARGET_EMAIL, auth_user_id: authUser!.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
