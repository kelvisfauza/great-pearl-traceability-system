import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canReadWithdrawalHistory, historyPage, HISTORY_PAGE_SIZE } from '../../supabase/functions/_shared/withdrawal-history-rules';

test('active Finance and administrators can read history without granting other staff access', () => {
  assert.equal(canReadWithdrawalHistory(true, true, false), true);
  assert.equal(canReadWithdrawalHistory(true, false, true), true);
  assert.equal(canReadWithdrawalHistory(true, false, false), false);
  assert.equal(canReadWithdrawalHistory(false, true, true), false);
});
test('history supports subsequent pages and rejects invalid offsets', () => {
  assert.equal(HISTORY_PAGE_SIZE, 50);
  assert.equal(historyPage(1) * HISTORY_PAGE_SIZE, 50);
  assert.equal(historyPage(-1), 0);
  assert.equal(historyPage('bad'), 0);
  assert.equal(historyPage(1.5), 0);
});