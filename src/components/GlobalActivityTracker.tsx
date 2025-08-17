import { useEffect } from 'react';
import { useActivityTracker } from '@/hooks/useActivityTracker';

export const GlobalActivityTracker = () => {
  const { trackDataEntry, trackFormSubmission } = useActivityTracker();

  useEffect(() => {
    // Track form submissions
    const trackFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (form.tagName === 'FORM') {
        const formName = form.id || form.className || 'form';
        trackFormSubmission(formName);
      }
    };

    // Track input interactions (data entry)
    const trackInputActivity = (event: Event) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT'
      ) {
        // Debounce to avoid too many calls
        setTimeout(() => {
          trackDataEntry();
        }, 1000);
      }
    };

    // Add event listeners
    document.addEventListener('submit', trackFormSubmit);
    document.addEventListener('change', trackInputActivity);
    document.addEventListener('input', trackInputActivity);

    // Cleanup
    return () => {
      document.removeEventListener('submit', trackFormSubmit);
      document.removeEventListener('change', trackInputActivity);
      document.removeEventListener('input', trackInputActivity);
    };
  }, [trackDataEntry, trackFormSubmission]);

  return null; // This component doesn't render anything
};