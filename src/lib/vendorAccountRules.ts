export function needsVendorAccount(source: string, type: string): boolean {
  return source === 'provider_submission_requests' && ['meal_plan', 'service_provider'].includes(type);
}

export function canClearVendorRequest(source: string, type: string, vendorId?: string | null): boolean {
  return !needsVendorAccount(source, type) || Boolean(vendorId);
}