import { useEffect, useState } from 'react';
import { offlineDb, QueuedOp } from './db';
import { onQueueChange } from './queue';

export function useQueueStatus() {
  const [items, setItems] = useState<QueuedOp[]>([]);

  const refresh = async () => {
    const all = await offlineDb.queue.orderBy('created_at').toArray();
    setItems(all);
  };

  useEffect(() => {
    void refresh();
    const off = onQueueChange(() => { void refresh(); });
    const interval = window.setInterval(() => { void refresh(); }, 5000);
    return () => { off(); window.clearInterval(interval); };
  }, []);

  return {
    items,
    pendingCount: items.filter(i => i.status === 'queued' || i.status === 'syncing').length,
    failedCount: items.filter(i => i.status === 'failed').length,
    conflictCount: items.filter(i => i.status === 'conflict').length,
    refresh,
  };
}