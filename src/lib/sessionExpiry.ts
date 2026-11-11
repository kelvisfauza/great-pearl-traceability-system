export const SESSION_EXPIRED_EVENT = 'app:session-expired';

// A bare 401/403 is not proof of expiry: it may be a permission/provider error.
export function isConfirmedSessionExpiry(status: number, body: unknown): boolean {
  if (status !== 400 && status !== 401 && status !== 403) return false;
  if (!body || typeof body !== 'object') return false;
  const error = body as Record<string, unknown>;
  const code = String(error.code || error.error_code || '');
  if (['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired'].includes(code)) return true;
  const message = String(error.message || error.error_description || error.msg || error.error || '');
  return /\b(jwt|access token|refresh token|session)\b.{0,40}\b(expired|expiration)\b/i.test(message)
    || /invalid refresh token.*(?:not found|already used)/i.test(message);
}

export function createSessionExpiryFetch(
  projectUrl: string,
  publishableKey: string,
  onExpired: (accessToken: string) => void,
  fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init),
): typeof fetch {
  return async (input, init) => {
    const response = await fetcher(input, init);
    try {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      const token = headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (url.origin !== new URL(projectUrl).origin || !token || token === publishableKey) return response;
      // Login failures must not log out an existing session.
      if (url.pathname.startsWith('/auth/v1/') && !(url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token')) return response;
      if ([400, 401, 403].includes(response.status)) {
        const body: unknown = await response.clone().json().catch(() => null);
        if (isConfirmedSessionExpiry(response.status, body)) {
          // Auth refresh holds a lock during fetch; handle only after it returns.
          setTimeout(() => onExpired(token), 0);
        }
      }
    } catch {
      // Detection must never replace the original request result.
    }
    return response;
  };
}