import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { globalErrorCapture } from '@/services/globalErrorCapture';
import { consoleCapture } from '@/hooks/useSupabaseConsoleMonitor';

const GlobalErrorCaptureInitializer = () => {
  const { employee, user } = useAuth();

  // Initialize global error and console capture once
  useEffect(() => {
    globalErrorCapture.initialize();
    consoleCapture.initialize();
  }, []);

  // Update user context whenever auth changes
  useEffect(() => {
    if (employee) {
      const context = {
        id: user?.id || employee.id,
        email: user?.email || employee.email,
        name: employee.name,
        department: employee.department
      };
      
      // Update both services with user context
      globalErrorCapture.setUserContext(context);
      consoleCapture.setUserContext(context);
      
      console.info(`Console monitoring active for: ${employee.name} (${employee.department})`);
    }
  }, [employee, user]);

  return null;
};

export default GlobalErrorCaptureInitializer;
