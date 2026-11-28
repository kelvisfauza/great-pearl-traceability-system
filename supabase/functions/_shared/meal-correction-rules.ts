/** A retained Admin approval authorises corrections, not a larger or different payee. */
export function mealRecheckAllowed(s: { request_type: string; status: string; admin_approved_amount: number | null; meal_revision: number }, revision: number): boolean {
  return s.request_type === 'meal_plan' && s.status === 'awaiting_finance' &&
    Number(s.admin_approved_amount) > 0 && s.meal_revision === revision;
}

export async function returnMealForCorrection(db: any, submission: any, reason: string) {
  const { data, error } = await db.rpc('return_meal_for_correction', {
    p_id: submission.id, p_revision: submission.meal_revision ?? 0, p_reason: reason,
  });
  if (error || !data?.ok) return { ok: false, error: error?.message || data?.error };
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) return { ok: false, error: 'Procurement email could not be requested' };
  const notice = await db.functions.invoke('procurement-review-notify', {
    headers: { Authorization: `Bearer ${serviceKey}` },
    body: { mode: 'returned', source_table: 'provider_submission_requests', record_id: submission.id },
  });
  return { ok: true, notified: !notice.error && notice.data?.ok === true };
}