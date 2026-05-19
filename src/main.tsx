
// ─────────────────────────────────────────────────────────────────
// EARLY CANONICAL REDIRECT (must run before any other module work).
// QR-code / public employee links must always resolve on the
// canonical public domain. Preview / sandbox hosts (Lovable preview
// URLs) require a workspace login and break for external scanners.
// We do this at the top of main.tsx so the redirect happens BEFORE
// React mounts and BEFORE any supabase client / fetch is initialised
// (avoids "cannot read property of undefined (reading apikey)" type
// errors that surface when the public URL is hit via a stale preview
// host on third-party browsers).
// ─────────────────────────────────────────────────────────────────
(() => {
  try {
    if (typeof window === 'undefined') return;
    const { hostname, pathname, search, hash } = window.location;
    const isPublicEmployeeRoute = pathname.startsWith('/employee/');
    if (!isPublicEmployeeRoute) return;
    const CANONICAL = 'greatpearlcoffeesystem.site';
    if (hostname === CANONICAL || hostname === `www.${CANONICAL}`) return;
    // Anything else (preview, sandbox, alt published URL) -> canonical
    window.location.replace(`https://${CANONICAL}${pathname}${search}${hash}`);
  } catch {
    /* no-op */
  }
})();

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@/utils/createMasikaAccount';
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
