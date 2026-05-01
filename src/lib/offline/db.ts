import Dexie, { Table } from 'dexie';

export interface QueuedOp {
  id?: number;
  client_op_id: string;        // idempotency key (UUID)
  kind: 'coffee_receipt' | 'quality_assessment' | 'milling_job';
  payload: any;                // exact insert payload + metadata
  created_at: string;
  last_error?: string;
  attempts: number;
  status: 'queued' | 'syncing' | 'failed' | 'conflict';
  user_label?: string;         // human-readable summary for the UI
}

export interface CachedRow {
  cache_key: string;           // e.g. "coffee_records:pending"
  data: any;                   // arbitrary JSON
  fetched_at: string;
}

class OfflineDB extends Dexie {
  queue!: Table<QueuedOp, number>;
  cache!: Table<CachedRow, string>;

  constructor() {
    super('gpcs_offline');
    this.version(1).stores({
      queue: '++id, client_op_id, kind, status, created_at',
      cache: 'cache_key, fetched_at',
    });
  }
}

export const offlineDb = new OfflineDB();

export const newOpId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `op_${Date.now()}_${Math.random().toString(36).slice(2)}`;