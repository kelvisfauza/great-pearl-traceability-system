import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useKeyboardShortcuts = () => {
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+G or Cmd+G for logout
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (user && signOut) {
          signOut('manual');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, signOut]);
};