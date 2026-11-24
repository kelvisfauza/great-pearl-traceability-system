export interface NoticeReview {
  decision?: string | null;
  returned_by?: string | null;
  returned_at?: string | null;
  return_count?: number | null;
  return_notified_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notified_at?: string | null;
}

export function reviewNoticeAllowed(mode: 'returned' | 'reviewed', review: NoticeReview, caller: { internal: boolean; email: string | null; name?: string | null }) {
  const actor = mode === 'returned' ? review.returned_by : review.reviewed_by;
  const at = mode === 'returned' ? review.returned_at : review.reviewed_at;
  const decision = String(review.decision ?? '').toLowerCase();
  const committed = mode === 'returned'
    ? decision === 'returned' && Number(review.return_count) >= 1
    : ['approved', 'rejected'].includes(decision);
  if (!committed || !actor || !at || !Number.isFinite(Date.parse(at))) return false;
  if (caller.internal) return true;
  const normalized = actor.trim().toLowerCase();
  return Boolean(caller.email && (normalized === caller.email.trim().toLowerCase() ||
    (caller.name && normalized === caller.name.trim().toLowerCase())));
}

export function reviewNoticeAlreadySent(mode: 'returned' | 'reviewed', review: NoticeReview) {
  const sent = mode === 'returned' ? review.return_notified_at : review.admin_notified_at;
  const committed = mode === 'returned' ? review.returned_at : review.reviewed_at;
  return Boolean(sent && committed && Number.isFinite(Date.parse(sent)) &&
    Number.isFinite(Date.parse(committed)) && Date.parse(sent) >= Date.parse(committed));
}