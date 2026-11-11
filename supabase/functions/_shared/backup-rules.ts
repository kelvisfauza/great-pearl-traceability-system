export const BACKUP_PROJECT = 'pudfybkyfedeggmokhco';
export function canRestore(roles: string[], authenticatedAt: number, now: number, confirmation: string, backup: { id: number; status: string; inserted_at: string } | undefined) {
  return roles.includes('Super Admin') && now >= authenticatedAt && now - authenticatedAt <= 600 && !!backup && backup.status === 'COMPLETED' && confirmation === `RESTORE ${backup.inserted_at}`;
}
export function providerMessage(status: number, body: string) {
  let message = 'Supabase request failed';
  try { const parsed = JSON.parse(body); if (typeof parsed.message === 'string') message = parsed.message; } catch { /* Never render upstream HTML. */ }
  return `[${status}] ${message}`;
}