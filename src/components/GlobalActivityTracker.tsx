import { useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';

const ActivityTrackerInternal = () => {
  const { trackDataEntry, trackFormSubmission, trackPageVisit, trackButtonClick } = useActivityTracker();
  const location = useLocation();
  const lastTrackedPage = useRef('');
  const clickDebounce = useRef<NodeJS.Timeout | null>(null);
  const inputDebounce = useRef<NodeJS.Timeout | null>(null);

  // Track page visits across all departments
  useEffect(() => {
    const page = location.pathname;
    if (page !== lastTrackedPage.current) {
      lastTrackedPage.current = page;
      trackPageVisit(page);
    }
  }, [location.pathname, trackPageVisit]);

  useEffect(() => {
    // Track form submissions
    const trackFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (form.tagName === 'FORM') {
        const formName = form.id || form.className || 'form';
        trackFormSubmission(formName);
      }
    };

    // Track input interactions (data entry) - debounced
    const trackInputActivity = () => {
      if (inputDebounce.current) clearTimeout(inputDebounce.current);
      inputDebounce.current = setTimeout(() => {
        trackDataEntry();
      }, 3000); // 3s debounce to avoid spam
    };

    // Track meaningful button clicks - debounced
    const trackClickActivity = (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button, [role="button"], a[href]');
      if (button && !button.closest('[data-no-track]')) {
        if (clickDebounce.current) clearTimeout(clickDebounce.current);
        clickDebounce.current = setTimeout(() => {
          trackButtonClick();
        }, 5000); // 5s debounce
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

  return null;
};

export const GlobalActivityTracker = () => {
  const authContext = useContext(AuthContext);
  if (!authContext) return null;
  return <ActivityTrackerInternal />;
};
