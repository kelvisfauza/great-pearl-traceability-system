export function supportedAttachment(a: { isInline?: boolean; contentType?: string; size?: number; name?: string }) {
  return !a.isInline && (a.size ?? 0) <= 20 * 1024 * 1024 &&
    (a.contentType === 'application/pdf' || ['image/jpeg','image/png','image/webp'].includes(a.contentType ?? ''));
}
export const RECONCILE_INTERVAL_MS = 60_000;
export function scheduledCheckDue(lastRun: string | null | undefined, now = Date.now()) {
  return !lastRun || now - Date.parse(lastRun) >= RECONCILE_INTERVAL_MS - 5_000;
}
export function validatedGraphPath(value: string) {
  const url = new URL(value.startsWith('/me/messages') ? '/v1.0'+value : value, 'https://graph.microsoft.com/v1.0/');
  if (url.origin !== 'https://graph.microsoft.com' || !url.pathname.startsWith('/v1.0/me/messages')) throw new Error('Invalid Outlook continuation');
  return url.pathname.slice('/v1.0'.length) + url.search;
}