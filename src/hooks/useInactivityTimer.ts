import { useEffect, useRef, useCallback, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const THROTTLE_DELAY = 2000; // Only reset timer once per 2 seconds max

export const useInactivityTimer = () => {
  const authContext = useContext(AuthContext);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  const performLogout = useCallback(async () => {
    const employee = employeeRef.current;
    const signOut = signOutRef.current;
    
    if (!signOut) return;
    
    console.log('User inactive for 30 minutes, logging out...');
    
    // No SMS for inactivity logout - just log out silently
    
    signOut('inactivity');
  }, []);

  const resetTimer = useCallback(() => {
    if (!userRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // Double-check: only logout if truly inactive
      const elapsed = Date.now() - lastActivityRef.current;
      if (userRef.current && isActiveRef.current && elapsed >= INACTIVITY_TIMEOUT - 5000) {
        performLogout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [performLogout]);

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
    if (!document.hidden) {
      // Tab became visible — reset activity timestamp and restart timer
      lastActivityRef.current = Date.now();
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    const user = authContext?.user;
    
    if (!user) {
      // Clear timer when user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    isActiveRef.current = true;
    lastActivityRef.current = Date.now();
    
    // Start the timer
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [authContext?.user?.id, handleActivity, resetTimer]);

  return null;
};
