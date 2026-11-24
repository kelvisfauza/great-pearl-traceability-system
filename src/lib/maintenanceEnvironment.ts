/** Preview exemptions affect the screen guard only, never staff permissions. */
export function shouldEnforceMaintenance(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const isLocalPreview = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host);
  const isLovablePreview =
    (host.startsWith('id-preview--') && host.endsWith('.lovable.app')) ||
    host.endsWith('.lovableproject.com');
  return !isLocalPreview && !isLovablePreview;
}
