import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const POSTER_SRC = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/happy-eid-poster.jpg'
const PDF_SRC = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/happy-eid-poster.pdf'
const BUCKET = 'profile_pictures'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Mirror assets to public storage so URLs are live immediately
  async function mirror(srcUrl: string, key: string, contentType: string): Promise<string> {
    const res = await fetch(srcUrl)
    if (!res.ok) throw new Error(`Failed to fetch ${srcUrl}: ${res.status}`)
    const buf = new Uint8Array(await res.arrayBuffer())
    await supabase.storage.from(BUCKET).upload(key, buf, {
      contentType, upsert: true, cacheControl: '3600',
    })
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key)
    return data.publicUrl
  }

  let image_url = POSTER_SRC
  let pdf_url = PDF_SRC
  try {
    image_url = await mirror(POSTER_SRC, 'broadcasts/happy-eid-2026.jpg', 'image/jpeg')
    pdf_url = await mirror(PDF_SRC, 'broadcasts/happy-eid-2026.pdf', 'application/pdf')
  } catch (e) {
    console.warn('Mirror failed, falling back to source URLs:', e)
  }

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, email, disabled, status')
    .eq('status', 'Active')
    .not('email', 'is', null)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipients = (employees ?? []).filter(
    (e: any) => !e.disabled && e.email && /@/.test(e.email),
  )

  let sent = 0
  let failed = 0
  const errors: any[] = []

  for (const emp of recipients) {
    try {
      const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'happy-eid',
          to: emp.email,
          data: { name: emp.name?.split(' ')[0] || 'Team', image_url, pdf_url },
          idempotencyKey: `happy-eid-2026-${emp.id}`,
        },
      })
      if (sendErr) { failed++; errors.push({ email: emp.email, error: sendErr.message }) }
      else sent++
    } catch (e: any) {
      failed++
      errors.push({ email: emp.email, error: e.message })
    }
  }

  return new Response(
    JSON.stringify({ ok: true, total: recipients.length, sent, failed, image_url, pdf_url, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})