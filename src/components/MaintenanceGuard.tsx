import { useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { AuthContext } from '@/contexts/AuthContext';
import MaintenancePage from '@/pages/MaintenancePage';
import { shouldEnforceMaintenance } from '@/lib/maintenanceEnvironment';

const BYPASS_ROUTES = ['/maintenance-recovery', '/auth', '/display', '/verify'];

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { isActive, reason, expectedBackOnline, loading } = useMaintenanceMode();
  const authContext = useContext(AuthContext);
  const location = useLocation();
  const enforceMaintenance = shouldEnforceMaintenance(window.location.hostname);

  // When maintenance activates, sign out the user
  useEffect(() => {
    if (enforceMaintenance && isActive && authContext?.user && authContext?.signOut) {
      authContext.signOut('inactivity');
    }
  }, [enforceMaintenance, isActive, authContext?.user, authContext?.signOut]);

  // Keep editor previews available, including during status loading.
  // The hook still reads real settings so administrators can manage live downtime.
  if (!enforceMaintenance) return <>{children}</>;

  if (loading) return null;

  // Allow bypass routes
  const isBypassRoute = BYPASS_ROUTES.some(r => location.pathname.startsWith(r));
  if (isBypassRoute) return <>{children}</>;

  // Show maintenance page if active
  if (isActive) {
    return <MaintenancePage reason={reason} expectedBackOnline={expectedBackOnline} />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
