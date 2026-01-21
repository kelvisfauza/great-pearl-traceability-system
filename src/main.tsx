
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useGlobalErrorHandler } from './hooks/useGlobalErrorHandler';


// Error Handler Component
const ErrorHandlerInitializer = () => {
  const { initializeErrorHandlers } = useGlobalErrorHandler();
  
  useEffect(() => {
    initializeErrorHandlers();
  }, []);
  
  return null;
};

// Main App with Error Handling
const AppWithErrorHandling = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Prevent multiple root creation during HMR
let root = (window as any).__REACT_ROOT__;
if (!root) {
  root = createRoot(rootElement);
  (window as any).__REACT_ROOT__ = root;
}

root.render(
  <AppWithErrorHandling />
);
