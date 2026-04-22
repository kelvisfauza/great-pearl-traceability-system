/**
 * Returns the canonical public URL for the app.
 *
 * QR codes and verification links must point to a stable public URL —
 * NOT to the ephemeral Lovable preview/sandbox host (which 404s once
 * the preview session expires).
 */
const PUBLIC_HOSTS = [
  'greatpearlcoffeesystem.site',
  'great-pearl-traceability-system.lovable.app',
];

const CANONICAL_PUBLIC_URL = 'https://greatpearlcoffeesystem.site';

export function getPublicAppOrigin(): string {
  if (typeof window === 'undefined') return CANONICAL_PUBLIC_URL;
  try {
    const host = window.location.hostname;
    // If we're already on a known public host, use the current origin
    // (preserves http vs https and exact domain the user is browsing).
    if (PUBLIC_HOSTS.some(h => host === h || host.endsWith('.' + h))) {
      return window.location.origin;
    }
  } catch {
    // ignore and fall through to canonical
  }
  return CANONICAL_PUBLIC_URL;
}

export function buildPublicUrl(path: string): string {
  const origin = getPublicAppOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}