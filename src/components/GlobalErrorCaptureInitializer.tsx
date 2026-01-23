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
    // IMPORTANT: We still want to capture logs even if the employee profile hasn't loaded yet
    // (or if a user exists without an employees row). This prevents users appearing "missing".
    if (!user && !employee) return;

    const context = {
      id: user?.id || employee?.id,
      email: user?.email || employee?.email,
      name:
        employee?.name ||
        (user?.user_metadata as any)?.name ||
        user?.email ||
        'Unknown User',
      department: employee?.department || 'Unknown'
    };

    globalErrorCapture.setUserContext(context);
    consoleCapture.setUserContext(context);

    // This is intentionally a console call so it appears in the IT console monitor.
    console.info(`Console monitoring active for: ${context.name} (${context.department})`);
  }, [employee, user]);

  return null;
};

export default GlobalErrorCaptureInitializer;
