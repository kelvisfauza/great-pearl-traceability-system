/**
 * Shared constants for the Trainee (intern) role.
 * Trainees are strictly view-only, see masked figures, and are guided
 * through the operations by an automatic walkthrough.
 */

export const TRAINEE_ROLE = 'Trainee';
export const TRAINEE_DEPARTMENT = 'Training';

// The only modules a trainee may browse (matches sidebar permission keys).
export const TRAINEE_PERMISSIONS: string[] = [
  'Store Management',
  'Quality Control',
  'Procurement',
  'Finance',
  'Inventory',
  'Sales Marketing',
  'EUDR Documentation',
];

// Routes (and their sub-paths) a trainee may open. Everything else redirects home.
export const TRAINEE_ALLOWED_ROUTES: string[] = [
  '/',
  '/store',
  '/quality-control',
  '/procurement',
  '/finance',
  '/inventory',
  '/sales-marketing',
  '/eudr-documentation',
  '/v2',
  '/v2/store',
  '/v2/quality',
  '/v2/procurement',
  '/v2/finance',
  '/v2/inventory',
  '/v2/sales',
  '/v2/eudr',
  '/auth',
  '/verify-device',
  '/reset-password',
];

export function isTraineeRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === 'trainee' || r === 'intern' || r === 'internee';
}

export function isTraineeRouteAllowed(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/') return true;
  return TRAINEE_ALLOWED_ROUTES.some((r) => r !== '/' && (path === r || path.startsWith(r + '/')));
}
