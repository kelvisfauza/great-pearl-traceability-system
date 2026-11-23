export type PostingReview = {
  status: string;
  linked_delivery_id?: string | null;
  reviewed_at?: string | null;
};

export function postingReviewStage(posting: PostingReview) {
  if (posting.status === 'reviewed') return 'reviewed';
  if (posting.status === 'needs_correction') return 'needs_correction';
  return posting.linked_delivery_id ? 'awaiting_admin' : 'awaiting_links';
}

export function hasSavedPostingReview(posting: PostingReview, expectedStatus: string) {
  return posting.status === expectedStatus && Boolean(posting.reviewed_at);
}