export const STORE_SAMPLER_EMAIL = "bwambalebenson@greatpearlcoffee.com";
export const PICKUP_RECIPIENT_EMAILS = [
  "tumwinealex@greatpearlcoffee.com",
  "onesmusrubambura@greatpearlcoffee.com",
];

export function needsStorePickup(order: { created_by_email?: string; status?: string }) {
  return order.created_by_email?.trim().toLowerCase() === STORE_SAMPLER_EMAIL && order.status === "pending";
}

export function canReceivePickup(employee: { email: string; phone?: string | null; disabled?: boolean | null }) {
  return PICKUP_RECIPIENT_EMAILS.includes(employee.email.toLowerCase()) && employee.disabled !== true && !!employee.phone?.trim();
}