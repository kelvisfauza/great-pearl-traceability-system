import { offlineDb } from './db';

/**
 * Read-through cache for react-query queries.
 *
 * Usage inside a queryFn:
 *   return cachedQuery('coffee_records:pending', () => fetchFromSupabase());
 *
 * Behavior:
 *  - When online: runs the network fetch, writes the result to IndexedDB, returns it.
 *  - When offline: returns the cached copy if any; otherwise rethrows.
 *  - When network fails: falls back to cache.
 */
export async function cachedQuery<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (!isOnline) {
    const cached = await offlineDb.cache.get(key);
    if (cached) return cached.data as T;
    throw new Error('You are offline and no cached copy is available for this view.');
  }

  try {
    const data = await fetcher();
    await offlineDb.cache.put({ cache_key: key, data, fetched_at: new Date().toISOString() });
    return data;
  } catch (err: any) {
    const cached = await offlineDb.cache.get(key);
    if (cached) return cached.data as T;
    throw err;
  }
}

export async function getCachedAge(key: string): Promise<Date | null> {
  const row = await offlineDb.cache.get(key);
  return row ? new Date(row.fetched_at) : null;
}