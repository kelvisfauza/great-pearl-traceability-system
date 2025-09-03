import { useEffect, useRef, useCallback, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { smsService } from '@/services/smsService';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useInactivityTimer = () => {
  const authContext = useContext(AuthContext);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  
  const user = authContext?.user;
  const employee = authContext?.employee;
  const signOut = authContext?.signOut;

  const resetTimer = useCallback(() => {
    if (!user || !signOut) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      if (user && isActiveRef.current && signOut) {
        console.log('User inactive for 5 minutes, logging out...');
        
        // Send SMS notification before logout
        if (employee?.phone) {
          try {
            await smsService.sendSMS(
              employee.phone,
              `Hi ${employee.name}, you have been logged out due to inactivity. Login again to access the system.`
            );
          } catch (error) {
            console.error('Failed to send inactivity SMS:', error);
          }
        }
        
        signOut('inactivity');
      }
    }, INACTIVITY_TIMEOUT);
  }, [user, employee, signOut]);

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