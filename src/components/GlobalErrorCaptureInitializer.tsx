import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { globalErrorCapture } from '@/services/globalErrorCapture';
import { useSupabaseConsoleMonitor } from '@/hooks/useSupabaseConsoleMonitor';

const GlobalErrorCaptureInitializer = () => {
  const { employee, user } = useAuth();
  const { initializeConsoleCapture } = useSupabaseConsoleMonitor();

  useEffect(() => {
    // Initialize global error capture
    globalErrorCapture.initialize();
  }, []);

  useEffect(() => {
    // Update user context when auth changes
    if (employee || user) {
      globalErrorCapture.setUserContext({
        id: user?.id || employee?.id,
        email: user?.email || employee?.email,
        name: employee?.name,
        department: employee?.department
      });
    }
  }, [employee, user]);

  useEffect(() => {
    // Initialize console capture
    initializeConsoleCapture();
  }, [initializeConsoleCapture]);

  return null;
};

export default GlobalErrorCaptureInitializer;
