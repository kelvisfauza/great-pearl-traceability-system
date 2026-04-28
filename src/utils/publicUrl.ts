/**
 * Returns the canonical public URL for the app.
 *
 * QR codes and verification links must point to a stable public URL —
 * NOT to the ephemeral Lovable preview/sandbox host (which 404s once
 * the preview session expires).
 */
const CANONICAL_PUBLIC_URL = 'https://greatpearlcoffeesystem.site';

/**
 * ALWAYS returns the canonical public domain.
 *
 * QR codes scanned by external users (suppliers, casual staff, anyone
 * without a Lovable account) must never land on the preview host
 * (`*.lovable.app` / `*.lovableproject.com`) — those require a Lovable
 * workspace login and will block the visitor.
 */
export function getPublicAppOrigin(): string {
  return CANONICAL_PUBLIC_URL;
}

export function buildPublicUrl(path: string): string {
  const origin = getPublicAppOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}