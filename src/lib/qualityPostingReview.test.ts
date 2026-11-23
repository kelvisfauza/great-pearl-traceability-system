import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postingReviewStage, hasSavedPostingReview } from './qualityPostingReview';

test('confirmed delivery links do not constitute administrator review', () => {
  assert.equal(postingReviewStage({ status: 'pending', linked_delivery_id: '20261120008' }), 'awaiting_admin');
  assert.equal(postingReviewStage({ status: 'pending', linked_delivery_id: null }), 'awaiting_links');
});

test('saved administrator decisions are not classified as waiting', () => {
  assert.equal(postingReviewStage({ status: 'reviewed', linked_delivery_id: '20261120008' }), 'reviewed');
  assert.equal(postingReviewStage({ status: 'needs_correction', linked_delivery_id: '20261120008' }), 'needs_correction');
});

test('successful verification requires the saved decision and review timestamp', () => {
  assert.equal(hasSavedPostingReview({ status: 'reviewed', reviewed_at: '2026-11-23T06:57:36Z' }, 'reviewed'), true);
  assert.equal(hasSavedPostingReview({ status: 'pending', reviewed_at: null }, 'reviewed'), false);
  assert.equal(hasSavedPostingReview({ status: 'reviewed', reviewed_at: null }, 'reviewed'), false);
});