// @ts-ignore Bun supplies this test-only module at runtime; the app uses Node typings.
import { test, expect, mock } from 'bun:test';

test('supplier totals arrive while unrelated display requests are still pending', async () => {
  let state: any;
  let cleanup: (() => void) | undefined;
  const summary = { topSuppliers: [{ name: 'Davis', kgs: 301740 }], totalKgs: 1600000 };
  mock.module('react', () => ({
    useState: (initial: any) => { state = initial; return [state, (update: any) => { state = update(state); }]; },
    useEffect: (effect: () => (() => void)) => { cleanup = effect(); },
  }));
  const pendingQuery: any = {
    then: () => new Promise(() => {}),
    select: () => pendingQuery, eq: () => pendingQuery,
    order: () => pendingQuery, limit: () => pendingQuery,
  };
  const channel: any = { on: () => channel, subscribe: () => channel };
  mock.module('@/integrations/supabase/client', () => ({ supabase: {
    rpc: async (name: string) => { expect(name).toBe('display_supplier_summary'); return { data: summary, error: null }; },
    from: () => pendingQuery, channel: () => channel, removeChannel: () => {},
  } }));
  const { useDisplayData } = await import('./useDisplayData');
  useDisplayData();
  await new Promise(resolve => setTimeout(resolve, 0));
  try {
    expect(state.topSuppliers).toEqual(summary.topSuppliers);
    expect(state.totalKgs).toBe(1600000);
    expect(state.loaded).toBe(false);
  } finally { cleanup?.(); }
});