import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Routes where IT Officers are strictly view-only.
// IT can still fully operate their own areas (attendance, SMS, security,
// backup, maintenance, procurement — handled elsewhere) so those routes
// are intentionally NOT in this list.
const READ_ONLY_ROUTES: string[] = [
  '/store',
  '/eudr',
  '/eudr-documentation',
  '/milling',
  '/inventory',
  '/field',
  '/field-operations',
  '/coffee-bookings',
  '/suppliers',
  '/human-resources',
  '/hr',
  '/expenses',
  '/my-expenses',
  '/company-forms',
  '/settings',
  '/logistics',
  '/reports',
];

export function isITOfficerRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'it officer' || r === 'it_officer' || r === 'it';
}

export function useIsITOfficer(): boolean {
  const { employee } = useAuth();
  return isITOfficerRole(employee?.role);
}

export function useITReadOnly(): boolean {
  const { employee, isAdmin, isSuperAdmin, isAdministrator } = useAuth();
  const location = useLocation();
  if (!employee) return false;
  if (isAdmin?.() || isSuperAdmin?.() || isAdministrator?.()) return false;
  if (!isITOfficerRole(employee.role)) return false;
  const path = location.pathname.toLowerCase();
  return READ_ONLY_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
}

export const IT_READ_ONLY_ROUTES = READ_ONLY_ROUTES;