import { useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { AuthContext } from '@/contexts/AuthContext';
import MaintenancePage from '@/pages/MaintenancePage';

const BYPASS_ROUTES = ['/maintenance-recovery', '/auth', '/display', '/verify'];

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { isActive, reason, loading } = useMaintenanceMode();
  const authContext = useContext(AuthContext);
  const location = useLocation();

  // When maintenance activates, sign out the user
  useEffect(() => {
    if (isActive && authContext?.user && authContext?.signOut) {
      authContext.signOut('inactivity');
    }
  }, [isActive]);

  if (loading) return null;

  // Allow bypass routes
  const isBypassRoute = BYPASS_ROUTES.some(r => location.pathname.startsWith(r));
  if (isBypassRoute) return <>{children}</>;

  // Show maintenance page if active
  if (isActive) {
    return <MaintenancePage reason={reason} />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
