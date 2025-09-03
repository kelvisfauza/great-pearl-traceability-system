import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useInactivityTimer = () => {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  const resetTimer = useCallback(() => {
    if (!user) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (user && isActiveRef.current) {
        console.log('User inactive for 5 minutes, logging out...');
        signOut('inactivity');
      }
    }, INACTIVITY_TIMEOUT);
  }, [user, signOut]);

  const handleActivity = useCallback(() => {
    if (user) {
      resetTimer();
    }
  }, [user, resetTimer]);

  useEffect(() => {
    if (!user) {
      // Clear timer when user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    isActiveRef.current = true;
    
    // Start the timer
    resetTimer();

    // Activity event listeners
    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      isActiveRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, handleActivity, resetTimer]);

  return null;
};