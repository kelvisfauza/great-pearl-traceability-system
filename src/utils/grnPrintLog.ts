import { supabase } from '@/integrations/supabase/client';

const cleanBatch = (v?: string | null) => (v || '').replace(/^GRN-/i, '').trim();

/**
 * Record GRN prints made outside Finance (e.g. Quality) in the shared
 * grn_print_log so Finance's "Ready for payment" list treats them as printed.
 * Matches finance lots by batch number; batches not yet in Finance are logged
 * by batch number only and matched later.
 */
export async function recordGrnPrintsByBatch(batchNumbers: (string | null | undefined)[]) {
  const batches = Array.from(new Set(batchNumbers.map(cleanBatch).filter(Boolean)));
  if (!batches.length) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const email = auth?.user?.email?.toLowerCase() || null;
    const nowIso = new Date().toISOString();

    const [{ data: lots }, { data: existing }] = await Promise.all([
      (supabase as any).from('finance_coffee_lots').select('id, batch_number').in('batch_number', batches),
      (supabase as any).from('grn_print_log').select('lot_id, batch_number').in('batch_number', batches),
    ]);

    const rows: any[] = [];
    const covered = new Set<string>();
    for (const l of (lots || []) as any[]) {
      covered.add(l.batch_number);
      rows.push({ lot_id: l.id, batch_number: l.batch_number, printed_by_email: email, last_printed_at: nowIso });
    }
    const logged = new Set(((existing || []) as any[]).map((r) => r.batch_number));
    for (const b of batches) {
      if (!covered.has(b) && !logged.has(b)) {
        rows.push({ lot_id: crypto.randomUUID(), batch_number: b, printed_by_email: email, last_printed_at: nowIso });
      }
    }
    if (!rows.length) return;
    const { error } = await (supabase as any).from('grn_print_log').upsert(rows, { onConflict: 'lot_id' });
    if (error) console.error('Failed to record GRN print', error);
  } catch (e) {
    console.error('Failed to record GRN print', e);
  }
}
