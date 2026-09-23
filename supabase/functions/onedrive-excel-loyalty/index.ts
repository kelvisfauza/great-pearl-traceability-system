import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_onedrive/v1.0'
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? ''
const ONEDRIVE_KEY = Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY') ?? ''

const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000
const kampalaToday = () => new Date(Date.now() + KAMPALA_OFFSET_MS).toISOString().slice(0, 10)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function graph(path: string): Promise<any> {
  const res = await fetch(`${GATEWAY}${path}`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': ONEDRIVE_KEY,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`OneDrive request failed [${res.status}] ${path}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : {}
}

const sha = async (value: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)
}

const norm = (v: unknown) => String(v ?? '').trim()

// A1-style column index -> letters
const colLetters = (n: number) => {
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const PERSON_HEADERS = [
  'email', 'e-mail', 'staff email', 'name', 'staff', 'staff name', 'employee',
  'filled by', 'entered by', 'recorded by', 'captured by', 'done by', 'by', 'officer', 'agent',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let scanId: string | null = null
  try {
    if (!LOVABLE_API_KEY || !ONEDRIVE_KEY) {
      return json({ ok: false, error: 'OneDrive is not connected for this project.' })
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))

    const { data: settingRow } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'excel_loyalty')
      .maybeSingle()

    const cfg = (settingRow?.setting_value ?? {}) as Record<string, any>
    const folderPath = String((body.folderPath as string) ?? cfg.folder_path ?? '').replace(/^\/+|\/+$/g, '')
    const includeShared = (body.includeShared as boolean) ?? cfg.include_shared === true
    const amountPerRow = Number(cfg.amount_per_row ?? 1000)
    const dailyCap = Number(cfg.daily_cap_per_user ?? 20000)
    const manual = body.manual === true
    const dryRun = body.dryRun === true
    // Re-read every workbook even when OneDrive reports it unchanged
    const force = body.force === true

    if (!cfg.enabled && !manual) return json({ ok: false, error: 'Excel loyalty tracking is switched off.' })
    if (!folderPath && !includeShared) return json({ ok: false, error: 'No OneDrive folder has been set.' })

    const { data: scan } = await supabase
      .from('excel_loyalty_scans')
      .insert({ status: 'running', details: { folderPath, manual, dryRun } })
      .select('id')
      .single()
    scanId = scan?.id ?? null

    // Staff directory for matching
    const { data: staff } = await supabase
      .from('employees')
      .select('id, name, email, alt_email, auth_user_id, status, disabled')
    const people = (staff || []).filter((e: any) => e.status === 'Active' && e.disabled !== true)

    const byEmail = new Map<string, any>()
    const byName = new Map<string, any>()
    for (const p of people) {
      if (p.email) byEmail.set(String(p.email).toLowerCase().trim(), p)
      if (p.alt_email) byEmail.set(String(p.alt_email).toLowerCase().trim(), p)
      if (p.name) byName.set(String(p.name).toLowerCase().trim(), p)
    }
    const findPerson = (raw: string) => {
      const v = raw.toLowerCase().trim()
      if (!v) return null
      if (byEmail.has(v)) return byEmail.get(v)
      if (byName.has(v)) return byName.get(v)
      // loose name match: all words of a staff name present
      for (const [name, p] of byName) {
        const parts = name.split(/\s+/).filter((w) => w.length > 2)
        if (parts.length && parts.every((w) => v.includes(w))) return p
      }
      return null
    }

    const today = kampalaToday()
    const { data: todaysAccruals } = await supabase
      .from('loyalty_daily_accruals')
      .select('user_id, amount')
      .eq('accrual_date', today)
      .eq('activity_type', 'excel_data_entry')
    const earnedToday = new Map<string, number>()
    for (const a of todaysAccruals || []) {
      earnedToday.set(a.user_id, (earnedToday.get(a.user_id) || 0) + Number(a.amount || 0))
    }

    let sharedListError: string | null = null
    // Files from the watched folder (own drive)
    let files: any[] = []
    if (folderPath) {
      const children = await graph(`/me/drive/root:/${encodeURI(folderPath)}:/children?$top=200&$select=id,name,file,lastModifiedBy,lastModifiedDateTime`)
      files = (children.value || []).filter((f: any) => /\.xlsx?$/i.test(f.name || '') && f.file)
    }

    // Workbooks shared with the connected account (live in other users' drives)
    if (includeShared) {
      try {
        const shared = await graph(`/me/drive/sharedWithMe?$top=200`)
        for (const s of shared.value || []) {
          const item = s?.remoteItem
          if (!item?.file || !/\.xlsx?$/i.test(item.name || '')) continue
          const driveId = item?.parentReference?.driveId
          if (!driveId || !item.id) continue
          if (files.some((f) => f.id === item.id)) continue
          files.push({ id: item.id, name: item.name, lastModifiedBy: item.lastModifiedBy, lastModifiedDateTime: item.lastModifiedDateTime, driveId })
        }
      } catch (e) {
        sharedListError = `Could not list shared files: ${String(e)}`
      }
    }

    let rowsSeen = 0, rowsNew = 0, rowsAwarded = 0, amountTotal = 0
    const perFile: Record<string, unknown>[] = []
    if (sharedListError) perFile.push({ shared: true, error: sharedListError })

    // Edge functions have a hard wall-clock limit; leave margin to save results
    const deadline = Date.now() + 100000
    let timedOut = false

    // Skip files that have not changed since the previous scan
    const knownMtimes: Record<string, string> = { ...((cfg.file_mtimes as Record<string, string>) ?? {}) }
    const newMtimes: Record<string, string> = { ...knownMtimes }
    // Most recently edited first, so active workbooks are never starved
    files.sort((a, b) => String(b.lastModifiedDateTime || '').localeCompare(String(a.lastModifiedDateTime || '')))

    for (const file of files) {
      if (Date.now() > deadline) { timedOut = true; break }
      const mtime = String(file.lastModifiedDateTime || '')
      if (mtime && knownMtimes[file.id] === mtime) continue
      const editorEmail = String(file?.lastModifiedBy?.user?.email || '').toLowerCase()
      const editorName = String(file?.lastModifiedBy?.user?.displayName || '')
      const editor = findPerson(editorEmail) || findPerson(editorName)
      let fileNew = 0, fileAwarded = 0
      // A single huge workbook must not starve the rest
      const fileDeadline = Math.min(deadline, Date.now() + 40000)
      let fileTimedOut = false
      const itemBase = file.driveId ? `/drives/${file.driveId}/items/${file.id}` : `/me/drive/items/${file.id}`

      // Preload every key already recorded for this file (cheap, one pass)
      const seenKeys = new Set<string>()
      const seenSheets = new Set<string>()
      for (let page = 0; page < 20; page++) {
        const { data: known } = await supabase
          .from('excel_loyalty_rows')
          .select('row_key, sheet_name')
          .eq('file_id', file.id)
          .range(page * 1000, page * 1000 + 999)
        for (const k of known || []) {
          seenKeys.add(k.row_key as string)
          if (k.sheet_name) seenSheets.add(k.sheet_name as string)
        }
        if (!known || known.length < 1000) break
      }

      let sheets: any[] = []

      try {
        const ws = await graph(`${itemBase}/workbook/worksheets?$select=id,name`)
        sheets = ws.value || []
      } catch (e) {
        perFile.push({ file: file.name, error: String(e) })
        continue
      }

      for (const sheet of sheets) {
        if (Date.now() > deadline) { timedOut = true; fileTimedOut = true; break }
        if (Date.now() > fileDeadline) { fileTimedOut = true; break }
        // First time we see a sheet, its existing rows are only recorded, never rewarded
        const isBaseline = !seenSheets.has(sheet.name)
        const pendingRows: Record<string, unknown>[] = []
        const accrueByPerson = new Map<string, { amount: number; count: number; name: string | null; matchedBy: string | null }>()
        try {
          const bounds = await graph(
            `${itemBase}/workbook/worksheets/${encodeURIComponent(sheet.name)}/usedRange(valuesOnly=true)?$select=address,rowCount,columnCount`,
          )
          const rowCount = Number(bounds.rowCount || 0)
          const colCount = Number(bounds.columnCount || 0)
          if (rowCount < 2 || colCount < 1) continue

          const lastCol = colLetters(Math.min(colCount, 40))
          const PAGE = 400
          let header: string[] = []
          let personCol = -1

          for (let start = 1; start <= rowCount; start += PAGE) {
            if (Date.now() > deadline) { timedOut = true; fileTimedOut = true; break }
            if (Date.now() > fileDeadline) { fileTimedOut = true; break }
            const end = Math.min(start + PAGE - 1, rowCount)
            const range = await graph(
              `${itemBase}/workbook/worksheets/${encodeURIComponent(sheet.name)}/range(address='A${start}:${lastCol}${end}')?$select=values`,
            )
            const values: unknown[][] = range.values || []

            for (let i = 0; i < values.length; i++) {
              const absRow = start + i
              const row = values[i] || []
              if (absRow === 1) {
                header = row.map((c) => norm(c).toLowerCase())
                personCol = header.findIndex((h) => h && PERSON_HEADERS.includes(h))
                if (personCol === -1) personCol = header.findIndex((h) => h.includes('email') || h.includes('by') || h.includes('name'))
                continue
              }
              const cells = row.map(norm)
              if (!cells.some((c) => c !== '')) continue
              rowsSeen++

              const rowKey = await sha(`${sheet.name}|${cells.join('\u0001')}`)
              if (seenKeys.has(rowKey)) continue
              seenKeys.add(rowKey)


              rowsNew++
              fileNew++

              const rowPerson = personCol >= 0 ? findPerson(cells[personCol] || '') : null
              const person = rowPerson || editor
              const matchedBy = rowPerson ? 'sheet column' : editor ? 'last editor' : null
              const preview = cells.filter(Boolean).slice(0, 5).join(' | ').slice(0, 200)

              let awarded = false
              let skipReason: string | null = null
              let amount = 0
              let walletId: string | null = null

              if (isBaseline) {
                skipReason = 'Existing work recorded before tracking started'
                walletId = person ? (person.auth_user_id || person.id) : null
              } else if (!person) {
                skipReason = 'No matching staff member'
              } else {
                walletId = person.auth_user_id || person.id
                const already = earnedToday.get(walletId!) || 0
                if (already >= dailyCap) {
                  skipReason = 'Daily cap reached'
                } else {
                  amount = Math.min(amountPerRow, dailyCap - already)
                  awarded = amount > 0
                }
              }

              if (awarded && walletId) {
                earnedToday.set(walletId, (earnedToday.get(walletId) || 0) + amount)
                const acc = accrueByPerson.get(walletId) || { amount: 0, count: 0, name: person?.name ?? null, matchedBy }
                acc.amount += amount
                acc.count += 1
                accrueByPerson.set(walletId, acc)
              }

              if (!dryRun) {
                pendingRows.push({
                  file_id: file.id,
                  file_name: file.name,
                  sheet_name: sheet.name,
                  row_key: rowKey,
                  row_preview: preview,
                  matched_by: matchedBy,
                  awarded_user_id: walletId,
                  awarded_employee_id: person?.id ?? null,
                  awarded_name: person?.name ?? null,
                  amount,
                  awarded,
                  skip_reason: skipReason,
                })
              }


              if (awarded) {
                rowsAwarded++
                fileAwarded++
                amountTotal += amount
              }
            }
            if (timedOut) break
          }

          // Save progress after every sheet so a time-out never loses work
          if (!dryRun) {
            for (const [walletId, acc] of accrueByPerson) {
              if (acc.amount <= 0) continue
              const { error: accErr } = await supabase.from('loyalty_daily_accruals').insert({
                user_id: walletId,
                activity_type: 'excel_data_entry',
                form_name: file.name,
                amount: acc.amount,
                accrual_date: today,
                metadata: { source: 'onedrive_excel', file_id: file.id, file_name: file.name, sheet: sheet.name, rows: acc.count, matched_by: acc.matchedBy },
              })
              if (accErr) perFile.push({ file: file.name, sheet: sheet.name, awardError: accErr.message, person: acc.name })
            }
            for (let i = 0; i < pendingRows.length; i += 500) {
              const { error: rowErr } = await supabase.from('excel_loyalty_rows').insert(pendingRows.slice(i, i + 500))
              if (rowErr) perFile.push({ file: file.name, sheet: sheet.name, recordError: rowErr.message })
            }
          }
        } catch (e) {
          perFile.push({ file: file.name, sheet: sheet.name, error: String(e) })
        }
      }

      perFile.push({ file: file.name, newRows: fileNew, awarded: fileAwarded, editor: editor?.name ?? editorName ?? null, shared: !!file.driveId, partial: fileTimedOut || undefined })
      // Only stamp a fully-read file; partial files get another turn next run
      if (mtime && !fileTimedOut) newMtimes[file.id] = mtime
      if (timedOut) break
    }

    if (!dryRun) {
      await supabase.from('system_settings')
        .update({ setting_value: { ...cfg, file_mtimes: newMtimes } })
        .eq('setting_key', 'excel_loyalty')
    }

    if (scanId) {
      await supabase.from('excel_loyalty_scans').update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        files_scanned: files.length,
        rows_seen: rowsSeen,
        rows_new: rowsNew,
        rows_awarded: rowsAwarded,
        amount_total: amountTotal,
        details: { folderPath, manual, dryRun, timedOut, files: perFile },
      }).eq('id', scanId)
    }

    return json({ ok: true, filesScanned: files.length, rowsSeen, rowsNew, rowsAwarded, amountTotal, timedOut, files: perFile })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('onedrive-excel-loyalty failed:', message)
    if (scanId) {
      await supabase.from('excel_loyalty_scans').update({
        status: 'failed', finished_at: new Date().toISOString(), error: message,
      }).eq('id', scanId)
    }
    return json({ ok: false, error: message })
  }
})
