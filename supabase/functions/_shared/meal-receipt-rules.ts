export function mealReceiptEvidence(request: { request_type: string; status: string; payout_status: string | null; payout_record_id: string | null }, payment: { id: string; yo_status: string | null } | null): boolean {
  return request.request_type === 'meal_plan' && request.status === 'paid' && ['success', 'cash'].includes(request.payout_status || '') &&
    !!payment && payment.id === request.payout_record_id && ['success', 'cash'].includes(payment.yo_status || '') && payment.yo_status === request.payout_status;
}