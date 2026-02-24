import { useEffect, useRef, useCallback, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
const THROTTLE_DELAY = 1000; // Only reset timer once per second max

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
    
    console.log('User inactive for 20 minutes, logging out...');
    
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
      if (userRef.current && isActiveRef.current) {
        performLogout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [performLogout]);

  const handleActivity = useCallback(() => {
    if (!userRef.current) return;
    
    const now = Date.now();
    // Throttle: only reset timer if enough time has passed since last activity
    if (now - lastActivityRef.current >= THROTTLE_DELAY) {
      lastActivityRef.current = now;
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

    // Activity event listeners - reduced set for better performance
    const events = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'visibilitychange'
    ];

    // Add event listeners with passive option for better performance
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true, capture: true });
    });

    // Cleanup
    return () => {
      isActiveRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, { capture: true });
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [authContext?.user?.id, handleActivity, resetTimer]);

  return null;
};
