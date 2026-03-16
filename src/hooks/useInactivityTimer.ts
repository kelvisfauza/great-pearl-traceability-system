import { useEffect, useRef, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DISPLAY_REDIRECT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const THROTTLE_DELAY = 2000; // Only reset timer once per 2 seconds max
const DISPLAY_ROUTE = '/display';

export const useInactivityTimer = () => {
  const authContext = useContext(AuthContext);
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const user = authContext?.user;
    const signOut = authContext?.signOut;

    const clearTimers = () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
        logoutTimeoutRef.current = null;
      }

      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
        displayTimeoutRef.current = null;
      }
    };

    if (!user || !signOut) {
      clearTimers();
      return;
    }

    const redirectToDisplay = () => {
      if (document.hidden || window.location.pathname === DISPLAY_ROUTE) return;

      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < DISPLAY_REDIRECT_TIMEOUT - 1000) return;

      console.log('User idle for 5 minutes, switching to display mode...');
      window.location.assign(DISPLAY_ROUTE);
    };

    const performLogout = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < INACTIVITY_TIMEOUT - 1000) return;

      console.log('User inactive for 30 minutes, logging out...');
      signOut('inactivity');
    };

    const resetTimers = () => {
      clearTimers();

      displayTimeoutRef.current = setTimeout(redirectToDisplay, DISPLAY_REDIRECT_TIMEOUT);
      logoutTimeoutRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT);
    };

    const handleActivity = () => {
      if (document.hidden) return;

      const now = Date.now();
      if (now - lastActivityRef.current < THROTTLE_DELAY) return;

      lastActivityRef.current = now;
      resetTimers();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimers();
        return;
      }

      lastActivityRef.current = Date.now();
      resetTimers();
    };

    lastActivityRef.current = Date.now();
    resetTimers();

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, { capture: true });
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimers();
    };
  }, [authContext?.user?.id, authContext?.signOut]);

  return null;
};