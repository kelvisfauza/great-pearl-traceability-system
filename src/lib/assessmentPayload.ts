/** Queue-only instructions must never be sent as assessment table columns. */
export function assessmentInsertPayload<T extends Record<string, unknown>>(payload: T) {
  const { _coffee_record_status_update, ...assessment } = payload;
  return assessment;
}

export function isRobustaCoffee(coffeeType?: string | null): boolean {
  return /robusta/i.test(coffeeType ?? '');
}