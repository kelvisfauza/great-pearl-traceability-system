import { supabase } from '@/integrations/supabase/client';
import { offlineDb, QueuedOp, newOpId } from './db';

/** Returns true if the browser currently believes it is online. */
export const isOnline = () =>
  typeof navigator !== 'undefined' ? navigator.onLine : true;

/**
 * Try to perform a write immediately. If offline (or it fails for network reasons),
 * push it into the local queue and resolve with `{ queued: true }`.
 * If online and successful, resolve with `{ queued: false, data }`.
 */
export async function executeOrQueue(opts: {
  kind: QueuedOp['kind'];
  payload: any;
  user_label?: string;
  /** function that performs the actual Supabase insert(s) when online */
  perform: (client_op_id: string) => Promise<any>;
}): Promise<{ queued: boolean; data?: any; client_op_id: string }> {
  const client_op_id = opts.payload.client_op_id || newOpId();
  const enriched = { ...opts.payload, client_op_id };

  if (!isOnline()) {
    await offlineDb.queue.add({
      client_op_id,
      kind: opts.kind,
      payload: enriched,
      created_at: new Date().toISOString(),
      attempts: 0,
      status: 'queued',
      user_label: opts.user_label,
    });
    return { queued: true, client_op_id };
  }

  try {
    const data = await opts.perform(client_op_id);
    return { queued: false, data, client_op_id };
  } catch (err: any) {
    // Network-style failure → queue it
    const msg = String(err?.message || err);
    const looksLikeNetwork =
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('networkerror') ||
      msg.toLowerCase().includes('load failed') ||
      err?.code === 'NETWORK_ERROR';

    if (looksLikeNetwork) {
      await offlineDb.queue.add({
        client_op_id,
        kind: opts.kind,
        payload: enriched,
        created_at: new Date().toISOString(),
        attempts: 1,
        status: 'queued',
        last_error: msg,
        user_label: opts.user_label,
      });
      return { queued: true, client_op_id };
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*  Per-kind sync handlers                                                    */
/* -------------------------------------------------------------------------- */

async function syncCoffeeReceipt(op: QueuedOp) {
  const p = op.payload;
  const { error: coffeeError } = await supabase
    .from('coffee_records')
    .insert([{
      id: p.id,
      supplier_id: p.supplier_id,
      supplier_name: p.supplier_name,
      coffee_type: p.coffee_type,
      date: p.date,
      kilograms: p.kilograms,
      bags: p.bags,
      batch_number: p.batch_number,
      status: p.status || 'pending',
      created_by: p.created_by,
      client_op_id: p.client_op_id,
    } as any]);
  if (coffeeError) throw coffeeError;

  if (p.finance_lot) {
    await supabase.from('finance_coffee_lots').insert(p.finance_lot as any);
  }
}

async function syncQualityAssessment(op: QueuedOp) {
  const p = op.payload;
  const { error } = await supabase
    .from('quality_assessments')
    .insert({ ...p } as any);
  if (error) throw error;

  if (p._coffee_record_status_update) {
    await supabase
      .from('coffee_records')
      .update({ status: p._coffee_record_status_update })
      .eq('id', p.store_record_id);
  }
}

async function syncMillingJob(op: QueuedOp) {
  const p = op.payload;
  const { error } = await supabase.from('milling_jobs').insert({ ...p } as any);
  if (error) throw error;
}

const HANDLERS: Record<QueuedOp['kind'], (op: QueuedOp) => Promise<void>> = {
  coffee_receipt: syncCoffeeReceipt,
  quality_assessment: syncQualityAssessment,
  milling_job: syncMillingJob,
};

/* -------------------------------------------------------------------------- */
/*  Sync runner                                                               */
/* -------------------------------------------------------------------------- */

let syncInFlight = false;
const listeners = new Set<() => void>();
export const onQueueChange = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const notify = () => listeners.forEach(cb => cb());

export async function syncQueue(): Promise<{ synced: number; failed: number; conflicts: number }> {
  if (syncInFlight || !isOnline()) return { synced: 0, failed: 0, conflicts: 0 };
  syncInFlight = true;
  let synced = 0, failed = 0, conflicts = 0;

  try {
    const pending = await offlineDb.queue
      .where('status').anyOf(['queued', 'failed'])
      .toArray();

    for (const op of pending) {
      await offlineDb.queue.update(op.id!, { status: 'syncing' });
      notify();
      try {
        await HANDLERS[op.kind](op);
        await offlineDb.queue.delete(op.id!);
        synced++;
      } catch (err: any) {
        const msg = String(err?.message || err);
        // Postgres unique-violation = duplicate / conflict (already synced or
        // another user beat us to it). Treat as terminal so we don't loop.
        const isConflict =
          err?.code === '23505' ||
          msg.includes('duplicate key') ||
          msg.includes('client_op_id');

        await offlineDb.queue.update(op.id!, {
          status: isConflict ? 'conflict' : 'failed',
          attempts: (op.attempts || 0) + 1,
          last_error: msg.slice(0, 500),
        });
        if (isConflict) conflicts++; else failed++;
      }
      notify();
    }
  } finally {
    syncInFlight = false;
    notify();
  }

  return { synced, failed, conflicts };
}

/** Wire up automatic sync on reconnect + an interval poll. */
export function startQueueAutoSync() {
  if (typeof window === 'undefined') return () => {};
  const onOnline = () => { void syncQueue(); };
  window.addEventListener('online', onOnline);
  const interval = window.setInterval(() => { void syncQueue(); }, 30_000);
  // initial pass
  void syncQueue();
  return () => {
    window.removeEventListener('online', onOnline);
    window.clearInterval(interval);
  };
}

/** Resolve a conflicted op manually (drops it from the queue). */
export async function discardOp(id: number) {
  await offlineDb.queue.delete(id);
  notify();
}

/** Force a retry on a failed op. */
export async function retryOp(id: number) {
  await offlineDb.queue.update(id, { status: 'queued', last_error: undefined });
  notify();
  void syncQueue();
}