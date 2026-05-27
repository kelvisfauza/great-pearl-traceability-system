import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { POSTER_B64, PDF_B64 } from './assets.ts'

const BUCKET = 'profile_pictures'

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Upload embedded assets to public storage so URLs are live immediately
  async function uploadAsset(b64: string, key: string, contentType: string): Promise<string> {
    const bytes = b64ToBytes(b64)
    await supabase.storage.from(BUCKET).upload(key, bytes, {
      contentType, upsert: true, cacheControl: '3600',
    })
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key)
    return data.publicUrl
  }

  const image_url = await uploadAsset(POSTER_B64, 'broadcasts/happy-eid-2026.jpg', 'image/jpeg')
  const pdf_url = await uploadAsset(PDF_B64, 'broadcasts/happy-eid-2026.pdf', 'application/pdf')

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
          recipientEmail: emp.email,
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