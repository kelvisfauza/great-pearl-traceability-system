import { useEffect } from 'react';
import { useSystemConsoleMonitor } from '@/hooks/useSystemConsoleMonitor';

// Component to initialize console monitoring
const ConsoleMonitorInitializer = () => {
  const { initializeConsoleCapture } = useSystemConsoleMonitor();
  
  useEffect(() => {
    // Initialize console capture when component mounts
    initializeConsoleCapture();
  }, [initializeConsoleCapture]);
  
  return null; // This component doesn't render anything
};

export default ConsoleMonitorInitializer;