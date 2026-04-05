import { useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DISPLAY_REDIRECT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DISPLAY_ROUTE = '/display';
const IDLE_RETURN_PATH_KEY = 'idle-display-return-path';

export const useInactivityTimer = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isOnDisplayRef = useRef(false);

  // Keep display ref in sync
  useEffect(() => {
    isOnDisplayRef.current = location.pathname === DISPLAY_ROUTE;
  }, [location.pathname]);

  const clearTimers = useCallback(() => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const user = authContext?.user;
    const signOut = authContext?.signOut;

    if (!user || !signOut) {
      clearTimers();
      sessionStorage.removeItem(IDLE_RETURN_PATH_KEY);
      return;
    }

    const wakeFromDisplay = (): boolean => {
      if (!isOnDisplayRef.current) return false;

      const returnPath = sessionStorage.getItem(IDLE_RETURN_PATH_KEY);
      if (!returnPath || returnPath === DISPLAY_ROUTE) return false;

      sessionStorage.removeItem(IDLE_RETURN_PATH_KEY);
      console.log('Waking from display, returning to:', returnPath);
      navigate(returnPath, { replace: true });
      return true;
    };

    const redirectToDisplay = () => {
      if (document.hidden || isOnDisplayRef.current) return;

      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < DISPLAY_REDIRECT_TIMEOUT - 1000) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      sessionStorage.setItem(IDLE_RETURN_PATH_KEY, currentPath);

      console.log('User idle for 5 minutes, switching to display mode...');
      navigate(DISPLAY_ROUTE, { replace: true });
    };

    const performLogout = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < INACTIVITY_TIMEOUT - 1000) return;

      sessionStorage.removeItem(IDLE_RETURN_PATH_KEY);
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
      lastActivityRef.current = now;

      // If on display page, wake immediately on ANY interaction — no throttle
      if (isOnDisplayRef.current) {
        wakeFromDisplay();
        return;
      }

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
  }, [authContext?.user?.id, authContext?.signOut, navigate, clearTimers]);

  return null;
};
