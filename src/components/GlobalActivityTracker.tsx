import { useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';

// Internal component that uses the hook
const ActivityTrackerInternal = () => {
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

  return null;
};

// Main component that conditionally renders based on auth context
export const GlobalActivityTracker = () => {
  const authContext = useContext(AuthContext);
  
  // Only render the activity tracker if auth context is available
  if (!authContext) {
    return null;
  }

  return <ActivityTrackerInternal />;
};