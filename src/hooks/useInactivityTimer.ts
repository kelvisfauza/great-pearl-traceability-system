import { useEffect, useRef, useCallback, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DISPLAY_REDIRECT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const THROTTLE_DELAY = 2000; // Only reset timer once per 2 seconds max
const DISPLAY_ROUTE = '/display';

export const useInactivityTimer = () => {
  const authContext = useContext(AuthContext);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isActiveRef = useRef(true);
  
  // Use refs to avoid recreating callbacks when these values change
  const userRef = useRef(authContext?.user);
  const employeeRef = useRef(authContext?.employee);
  const signOutRef = useRef(authContext?.signOut);
  
  // Update refs when context changes
  useEffect(() => {
    userRef.current = authContext?.user;
    employeeRef.current = authContext?.employee;
    signOutRef.current = authContext?.signOut;
  }, [authContext?.user, authContext?.employee, authContext?.signOut]);

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

  const performLogout = useCallback(async () => {
    const signOut = signOutRef.current;
    
    if (!signOut) return;
    
    console.log('User inactive for 30 minutes, logging out...');
    signOut('inactivity');
  }, []);

  const redirectToDisplay = useCallback(() => {
    if (!userRef.current || document.hidden || window.location.pathname === DISPLAY_ROUTE) return;

    console.log('User idle for 5 minutes, switching to display mode...');
    window.location.assign(DISPLAY_ROUTE);
  }, []);

  const resetTimer = useCallback(() => {
    if (!userRef.current) return;

    clearTimers();

    displayTimeoutRef.current = setTimeout(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (userRef.current && isActiveRef.current && elapsed >= DISPLAY_REDIRECT_TIMEOUT - 5000) {
        redirectToDisplay();
      }
    }, DISPLAY_REDIRECT_TIMEOUT);

    logoutTimeoutRef.current = setTimeout(() => {
      // Double-check: only logout if truly inactive
      const elapsed = Date.now() - lastActivityRef.current;
      if (userRef.current && isActiveRef.current && elapsed >= INACTIVITY_TIMEOUT - 5000) {
        performLogout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [clearTimers, performLogout, redirectToDisplay]);

  const handleActivity = useCallback(() => {
    if (!userRef.current) return;
    
    // If page is hidden (tab switched), ignore — timer pauses via visibilitychange
    if (document.hidden) return;
    
    const now = Date.now();
    if (now - lastActivityRef.current >= THROTTLE_DELAY) {
      lastActivityRef.current = now;
      resetTimer();
    }
  }, [resetTimer]);

  // Pause/resume timer on tab visibility change
  const handleVisibility = useCallback(() => {
    if (!userRef.current) return;

    if (document.hidden) {
      clearTimers();
      return;
    }

    // Tab became visible — reset activity timestamp and restart timer
    lastActivityRef.current = Date.now();
    resetTimer();
  }, [clearTimers, resetTimer]);

  useEffect(() => {
    const user = authContext?.user;
    
    if (!user) {
      clearTimers();
      return;
    }

    isActiveRef.current = true;
    lastActivityRef.current = Date.now();
    
    // Start the timers
    resetTimer();

    // Activity event listeners — includes mousemove for reliable active detection
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners with passive option for better performance
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', handleVisibility);

    // Cleanup
    return () => {
      isActiveRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, { capture: true });
      });
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimers();
    };
  }, [authContext?.user?.id, clearTimers, handleActivity, resetTimer, handleVisibility]);

  return null;
};
