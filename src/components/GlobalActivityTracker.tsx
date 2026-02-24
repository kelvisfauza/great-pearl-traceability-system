import { useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useFraudDetection } from '@/hooks/useFraudDetection';
import { useFraudLockCheck } from '@/hooks/useFraudLockCheck';
import FraudLockScreen from './FraudLockScreen';

const ActivityTrackerInternal = () => {
  const { trackDataEntry, trackFormSubmission, trackPageVisit, trackButtonClick } = useActivityTracker();
  const location = useLocation();
  const lastTrackedPage = useRef('');
  const clickDebounce = useRef<NodeJS.Timeout | null>(null);
  const inputDebounce = useRef<NodeJS.Timeout | null>(null);
  const { lockData, clearLock, triggerLock } = useFraudLockCheck();

  // Fraud detection - triggers lock on rapid page browsing
  useFraudDetection(() => {
    triggerLock();
  });

  // Track page visits across all departments
  useEffect(() => {
    const page = location.pathname;
    if (page !== lastTrackedPage.current) {
      lastTrackedPage.current = page;
      trackPageVisit(page);
    }
  }, [location.pathname, trackPageVisit]);

  useEffect(() => {
    const trackFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (form.tagName === 'FORM') {
        const formName = form.id || form.className || 'form';
        trackFormSubmission(formName);
      }
    };

    const trackInputActivity = (event: Event) => {
      const target = event.target as HTMLElement;
      // Only track real user input on actual form fields, not React re-renders
      if (!target || !('tagName' in target)) return;
      const tag = target.tagName.toUpperCase();
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
      // Ignore hidden/readonly fields
      if ((target as HTMLInputElement).type === 'hidden' || (target as HTMLInputElement).readOnly) return;
      // Must be user-initiated (isTrusted)
      if (!event.isTrusted) return;

      if (inputDebounce.current) clearTimeout(inputDebounce.current);
      inputDebounce.current = setTimeout(() => {
        trackDataEntry();
      }, 30000); // 30s debounce - only reward sustained data entry
    };

    const trackClickActivity = (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button, [role="button"], a[href]');
      if (button && !button.closest('[data-no-track]')) {
        if (clickDebounce.current) clearTimeout(clickDebounce.current);
        clickDebounce.current = setTimeout(() => {
          trackButtonClick();
        }, 5000);
      }
    };

    document.addEventListener('submit', trackFormSubmit);
    document.addEventListener('change', trackInputActivity);
    document.addEventListener('input', trackInputActivity);
    document.addEventListener('click', trackClickActivity);

    return () => {
      document.removeEventListener('submit', trackFormSubmit);
      document.removeEventListener('change', trackInputActivity);
      document.removeEventListener('input', trackInputActivity);
      document.removeEventListener('click', trackClickActivity);
      if (inputDebounce.current) clearTimeout(inputDebounce.current);
      if (clickDebounce.current) clearTimeout(clickDebounce.current);
    };
  }, [trackDataEntry, trackFormSubmission, trackButtonClick]);

  // Always render — never early-return before this point
  // Show fraud lock screen as a portal-like overlay when locked
  if (lockData) {
    return (
      <FraudLockScreen
        lockId={lockData.id}
        userName={lockData.user_name}
        onUnlocked={clearLock}
      />
    );
  }

  return null;
};

export const GlobalActivityTracker = () => {
  const authContext = useContext(AuthContext);

  // Don't conditionally skip rendering — just render nothing visible
  if (!authContext) return null;

  return <ActivityTrackerInternal />;
};
