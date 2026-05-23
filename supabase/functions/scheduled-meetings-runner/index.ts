import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fauzakusa — designated system host for scheduled meetings
const SYSTEM_HOST_ID = '00b188fc-73fe-4ee7-9fe9-956ab2faa6ec'
const MEETING_DURATION_MIN = 60

// Returns today's 9 AM Kampala time (UTC+3) as a UTC Date
function todayAt9amKampala(): Date {
  const now = new Date()
  // Convert "now" to Kampala wall time
  const kampala = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Kampala' }))
  kampala.setHours(9, 0, 0, 0)
  // kampala is naive — convert back: Kampala = UTC+3 always (no DST)
  return new Date(kampala.getTime() - 3 * 60 * 60 * 1000)
}

function todayKampalaDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
}

function kampalaWeekday(): number {
  // 0 = Sun, 1 = Mon, 2 = Tue
  const s = new Date().toLocaleString('en-US', { timeZone: 'Africa/Kampala', weekday: 'short' })
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[s as 'Sun'|'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'] ?? -1
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: any = {}
  try { body = await req.json() } catch {}
  const action: string = body.action || 'auto'

  const results: any = { action, created: [], ended: [], errors: [] }

  try {
    const weekday = kampalaWeekday()
    const today = todayKampalaDateStr()

    // ---------- CREATE ----------
    if (action === 'create-general' || (action === 'auto' && weekday === 1)) {
      const { data: existing } = await supabase
        .from('scheduled_meetings')
        .select('id')
        .eq('kind', 'general_monday')
        .eq('scheduled_date', today)
        .maybeSingle()

      if (!existing) {
        const startAt = todayAt9amKampala().toISOString()
        const { data: call, error: callErr } = await supabase
          .from('group_calls')
          .insert({ host_id: SYSTEM_HOST_ID, call_type: 'audio',
            title: 'General Monday Meeting', status: 'active' })
          .select('id').single()
        if (callErr) throw callErr

        await supabase.from('group_call_participants').insert({
          call_id: call.id, user_id: SYSTEM_HOST_ID, status: 'joined',
          joined_at: new Date().toISOString(),
        })

        const { data: meeting, error: mErr } = await supabase
          .from('scheduled_meetings')
          .insert({ kind: 'general_monday', title: 'General Monday Meeting',
            scheduled_for: startAt, scheduled_date: today, status: 'live',
            call_id: call.id, host_user_id: SYSTEM_HOST_ID,
            started_at: new Date().toISOString() })
          .select('id').single()
        if (mErr) throw mErr

        results.created.push({ kind: 'general_monday', meeting_id: meeting.id, call_id: call.id })

        // Fire broadcast email (non-blocking-ish)
        await supabase.functions.invoke('send-meeting-briefing', {
          body: { kind: 'reminder', meeting_id: meeting.id }
        }).catch((e) => results.errors.push({ stage: 'email-general', error: String(e) }))
      }
    }

    if (action === 'create-departmental' || (action === 'auto' && weekday === 2)) {
      const { data: depts } = await supabase
        .from('employees')
        .select('department')
        .eq('status', 'Active')
        .not('department', 'is', null)

      const unique = Array.from(new Set(((depts || []) as any[])
        .map(d => (d.department as string)?.trim())
        .filter((d): d is string => !!d && d.length > 0)))

      const startAt = todayAt9amKampala().toISOString()

      for (const dept of unique) {
        const { data: existing } = await supabase
          .from('scheduled_meetings')
          .select('id')
          .eq('kind', 'departmental_tuesday')
          .eq('scheduled_date', today)
          .eq('department', dept)
          .maybeSingle()
        if (existing) continue

        const { data: call, error: callErr } = await supabase
          .from('group_calls')
          .insert({ host_id: SYSTEM_HOST_ID, call_type: 'audio',
            title: `${dept} — Departmental Meeting`, status: 'active' })
          .select('id').single()
        if (callErr) { results.errors.push({ dept, error: callErr.message }); continue }

        await supabase.from('group_call_participants').insert({
          call_id: call.id, user_id: SYSTEM_HOST_ID, status: 'joined',
          joined_at: new Date().toISOString(),
        })

        const { data: meeting, error: mErr } = await supabase
          .from('scheduled_meetings')
          .insert({ kind: 'departmental_tuesday', department: dept,
            title: `${dept} — Departmental Meeting`, scheduled_for: startAt,
            scheduled_date: today, status: 'live', call_id: call.id,
            host_user_id: SYSTEM_HOST_ID, started_at: new Date().toISOString() })
          .select('id').single()
        if (mErr) { results.errors.push({ dept, error: mErr.message }); continue }

        results.created.push({ kind: 'departmental_tuesday', department: dept, meeting_id: meeting.id, call_id: call.id })

        await supabase.functions.invoke('send-meeting-briefing', {
          body: { kind: 'reminder', meeting_id: meeting.id, department: dept }
        }).catch((e) => results.errors.push({ stage: 'email-dept', dept, error: String(e) }))
      }
    }

    // ---------- END stale meetings ----------
    if (action === 'end-stale' || action === 'auto') {
      const cutoff = new Date(Date.now() - MEETING_DURATION_MIN * 60_000).toISOString()
      const { data: stale } = await supabase
        .from('scheduled_meetings')
        .select('id, call_id, title')
        .eq('status', 'live')
        .lt('started_at', cutoff)

      for (const m of (stale || []) as any[]) {
        await supabase.from('scheduled_meetings')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', m.id)

        if (m.call_id) {
          await supabase.from('group_calls')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('id', m.call_id)
            .neq('status', 'ended')
        }

        const { data: nshow } = await supabase.rpc('mark_meeting_no_shows', { _meeting_id: m.id })
        results.ended.push({ meeting_id: m.id, no_shows: nshow })
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('scheduled-meetings-runner error', e)
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e), ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  }
})