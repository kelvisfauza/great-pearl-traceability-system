import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { reviewNoticeAllowed, reviewNoticeAlreadySent } from './noticeRules.ts';
const review = { decision: 'returned', returned_by: 'System automatic checks', return_count: 1, returned_at: '2026-11-28T04:00:00Z' };
Deno.test('trusted worker can email a saved system correction', () => {
  assertEquals(reviewNoticeAllowed('returned', review, { internal: true, email: null }), true);
});
Deno.test('staff cannot impersonate system returns to send notices', () => {
  assertEquals(reviewNoticeAllowed('returned', review, { internal: false, email: 'staff@example.test' }), false);
});
Deno.test('failed correction emails remain eligible for delivery', () => {
  assertEquals(reviewNoticeAlreadySent('returned', review), false);
});
Deno.test('accepted email notices are not resent for the same return', () => {
  assertEquals(reviewNoticeAlreadySent('returned', { ...review, return_notified_at: '2026-11-28T04:01:00Z' }), true);
});
Deno.test('a new correction return can send a new notice', () => {
  assertEquals(reviewNoticeAlreadySent('returned', { ...review, returned_at: '2026-11-28T05:00:00Z', return_notified_at: '2026-11-28T04:01:00Z' }), false);
});