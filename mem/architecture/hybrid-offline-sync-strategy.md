---
name: Hybrid Offline Sync Strategy
description: Dexie-based offline write queue and read cache for Quality, Store, and Milling pages
type: feature
---
The system supports limited offline operation for the three departments most affected by poor network: **Quality, Store (Coffee Receipts), and Milling**.

## Architecture
- **IndexedDB store**: `gpcs_offline` via Dexie (`src/lib/offline/db.ts`). Two tables: `queue` (pending writes) and `cache` (read-through snapshots).
- **Write queue**: every supported insert is wrapped in `executeOrQueue({ kind, payload, perform })` from `src/lib/offline/queue.ts`. When offline (or on a network error), the op is stored locally and replayed on reconnect.
- **Read cache**: lists wrapped with `cachedQuery(key, fetcher)` from `src/lib/offline/cache.ts` write fetched data into IndexedDB and serve it back when offline.
- **Auto-sync**: `startQueueAutoSync()` (mounted in App via `OfflineSyncBoot`) listens for `window.online` and runs every 30s.
- **UI**: `<OfflineIndicator />` is a fixed bottom-right chip showing online/offline + queue badge. Opens a sheet listing pending/failed/conflict ops with Retry / Discard.

## Idempotency (CRITICAL)
Every write payload includes a client-generated `client_op_id` (UUID). The DB enforces uniqueness via partial indexes on:
- `coffee_records.client_op_id`
- `quality_assessments.client_op_id`
- `milling_jobs.client_op_id`

This guarantees safe retries: a duplicate sync attempt fails with Postgres `23505`, the queue marks the op as `conflict` (not `failed`), and the user can discard it. **Never remove these unique indexes.**

## Supported kinds
- `coffee_receipt` → `coffee_records` (+ `finance_coffee_lots`)
- `quality_assessment` → `quality_assessments` + status update on `coffee_records`
- `milling_job` → `milling_jobs`

## Adding a new offline-capable form
1. Wrap the mutation: `await executeOrQueue({ kind, payload, user_label, perform })`.
2. Add a sync handler in `queue.ts` `HANDLERS` map.
3. Add a unique partial index on `<table>.client_op_id` via migration.
4. Toast `"Saved offline"` when `result.queued === true`.

## Conflict policy
Server-rejects-duplicates. No auto-merge — conflicts surface in the OfflineIndicator panel and the user discards them manually after verifying the record exists.
