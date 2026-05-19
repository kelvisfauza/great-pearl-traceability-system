import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RECIPIENTS = ['fauzakusa@greatpearlcoffee.com', 'operations@greatpearlcoffee.com']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const payload = await req.json().catch(() => ({}))
    const { operation, target_user_id, old_role, new_role, actor_user_id, occurred_at } = payload || {}

    // Resolve emails for actor + target (best-effort)
    const resolve = async (uid?: string) => {
      if (!uid) return 'unknown'
      try {
        const { data } = await supabase.auth.admin.getUserById(uid)
        return data?.user?.email || uid
      } catch { return uid }
    }
    const [actorEmail, targetEmail] = await Promise.all([resolve(actor_user_id), resolve(target_user_id)])

    const when = new Date(occurred_at || Date.now()).toLocaleString()
    const subject = `[SECURITY] Role ${operation} — ${targetEmail} (${old_role || '∅'} → ${new_role || '∅'})`
    const message =
      `A role change just occurred on user_roles.\n\n` +
      `Operation:   ${operation}\n` +
      `Target user: ${targetEmail}  (${target_user_id})\n` +
      `Old role:    ${old_role || '∅'}\n` +
      `New role:    ${new_role || '∅'}\n` +
      `Performed by: ${actorEmail}  (${actor_user_id || 'NULL — direct DB / superuser session'})\n` +
      `Time:        ${when}\n\n` +
      `If you did NOT authorize this change, investigate immediately:\n` +
      `  1. Revoke the role in Permission Management.\n` +
      `  2. Check role_change_audit for the full history.\n` +
      `  3. Review Supabase dashboard access for IT staff.\n`

    let sent = 0
    for (const recipient of RECIPIENTS) {
      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: recipient,
            idempotencyKey: `role-change-${target_user_id}-${occurred_at}-${recipient}`,
            templateData: {
              title: 'Role Change Alert',
              subject,
              message,
              recipientName: recipient.split('@')[0],
            },
          },
        })
        if (!error) sent++
      } catch (e) {
        console.error('alert send failed', recipient, e)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})