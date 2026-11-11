export const SETTINGS_ALERT_RECIPIENT = 'fauzakusa@greatpearlcoffee.com';
export function emailDelivered(result: { ok?: boolean; email_status?: string; skipped?: boolean } | null): boolean {
  return result?.ok === true && result.email_status === 'sent' && result.skipped !== true;
}
export function alertData(event: { control: string; record_label: string; actor: string; action: string; fields: string[]; created_at: string }) {
  return {
    subject: `Settings saved: ${event.control}`,
    title: 'Settings change saved',
    recipientName: 'Fauza',
    message: `Control: ${event.control}\nRecord: ${event.record_label}\nAction: ${event.action}\nChanged by: ${event.actor}\nSaved at (UTC): ${event.created_at}\nChanged fields: ${event.fields.join(', ')}\n\nThis confirms a saved change, not that any payment was made. Sensitive values are not included.`,
    ctaUrl: 'https://greatpearlcoffeesystem.site/admin/system-settings',
    ctaLabel: 'Open Settings',
  };
}