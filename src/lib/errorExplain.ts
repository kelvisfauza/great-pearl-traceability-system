// Turns raw captured errors into plain sentences: "<who> was trying to <action> on <page>, but it failed because <reason>."

const humanize = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

export function pageName(path: string): string {
  const p = (path || '/').split('?')[0].replace(/\/+$/, '') || '/';
  if (p === '/') return 'the Home page';
  const parts = p.split('/').filter(Boolean).filter(x => !/^[0-9a-f-]{8,}$/i.test(x) && !/^\d+$/.test(x));
  return `the ${parts.map(x => humanize(x).replace(/\b\w/g, c => c.toUpperCase())).join(' › ')} page`;
}

export function describeAction(url: string, method = 'GET'): string {
  const m = (method || 'GET').toUpperCase();
  let path = url;
  try { path = new URL(url).pathname; } catch { /* keep */ }
  const rpc = path.match(/\/rest\/v1\/rpc\/([^/?]+)/);
  if (rpc) return `run the "${humanize(rpc[1])}" check`;
  const fn = path.match(/\/functions\/v1\/([^/?]+)/);
  if (fn) return `use the "${humanize(fn[1])}" service`;
  const tbl = path.match(/\/rest\/v1\/([^/?]+)/);
  if (tbl) {
    const what = humanize(tbl[1]);
    if (m === 'GET' || m === 'HEAD') return `load ${what}`;
    if (m === 'POST') return `save new ${what}`;
    if (m === 'PATCH' || m === 'PUT') return `update ${what}`;
    if (m === 'DELETE') return `delete ${what}`;
  }
  if (path.includes('/auth/v1/')) return 'sign in or refresh their session';
  if (path.includes('/storage/v1/')) return m === 'GET' ? 'open a file' : 'upload a file';
  return `reach ${path}`;
}

export function explainReason(status?: number, body?: { message?: string; code?: string; hint?: string; error?: string } | null): string {
  const msg = body?.message || body?.error || '';
  const code = body?.code || '';
  if (code === 'PGRST202') return 'the system could not find that check with the details sent (the app and database do not match — needs a developer fix)';
  if (code === '23505') return 'the same record already exists (duplicate)';
  if (code === '42501' || status === 403) return `they do not have permission for this${msg ? ` (${msg})` : ''}`;
  if (status === 401) return 'their sign-in had expired';
  if (status === 404) return 'the item could not be found';
  if (status === 409) return 'it clashes with an existing record';
  if (status === 0 || status === undefined) return msg ? `the connection failed (${msg})` : 'the internet connection dropped';
  if (status >= 500) return `the server had a problem${msg ? ` (${msg})` : ''}`;
  if (msg) return `the system rejected it: ${msg}`;
  return `the system rejected the request (code ${status})`;
}

export function explainError(who: string, e: { page?: string; url?: string; method?: string; status?: number; body?: any; description?: string; title?: string }): string {
  const where = pageName(e.page || '/');
  if (e.url) return `${who} was trying to ${describeAction(e.url, e.method)} on ${where}, but it failed because ${explainReason(e.status, e.body)}.`;
  return `${who} was using ${where} when the screen hit a problem: ${e.description || e.title || 'unknown error'}.`;
}
