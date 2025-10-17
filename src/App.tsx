import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PriceProvider } from "@/contexts/PriceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useGlobalErrorHandler } from "./hooks/useGlobalErrorHandler";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Procurement from "./pages/Procurement";
import QualityControl from "./pages/QualityControl";
import Inventory from "./pages/Inventory";
import Store from "./pages/Store";
import SalesMarketing from "./pages/SalesMarketing";
import Finance from "./pages/Finance";
import HumanResources from "./pages/HumanResources";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Logistics from "./pages/Logistics";
import DataAnalyst from "./pages/DataAnalyst";
import FieldOperations from "./pages/FieldOperations";
import Processing from "./pages/Processing";
import ITDepartment from "./pages/ITDepartment";
import Milling from "./pages/Milling";
import PermissionManagement from "./pages/PermissionManagement";
import Expenses from "./pages/Expenses";
import EURDocumentationPage from "./pages/EUDRDocumentation";
import Suppliers from "./pages/Suppliers";
import { GlobalActivityTracker } from "./components/GlobalActivityTracker";
import { OvertimeNotification } from "./components/OvertimeNotification";
import RoleNotificationHandler from "./components/RoleNotificationHandler";
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Error Handler Component
const ErrorHandlerInitializer = () => {
  const { initializeErrorHandlers } = useGlobalErrorHandler();
  
  useEffect(() => {
    initializeErrorHandlers();
  }, []);
  
  return null;
};

// Inactivity Timer Component
const InactivityTimerInitializer = () => {
  useInactivityTimer();
  useKeyboardShortcuts();
  return null;
};

const App: React.ComponentType = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorHandlerInitializer />
        <InactivityTimerInitializer />
        <GlobalActivityTracker />
        <PriceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {/* OvertimeNotification moved inside Router context */}
              <OvertimeNotification />
              <RoleNotificationHandler />
              
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/procurement" element={
                  <ProtectedRoute requiredPermissions={["Procurement"]}>
                    <Procurement />
                  </ProtectedRoute>
                } />
                <Route path="/quality-control" element={
                  <ProtectedRoute requiredPermissions={["Quality Control"]}>
                    <QualityControl />
                  </ProtectedRoute>
                } />
                <Route path="/inventory" element={
                  <ProtectedRoute requiredPermissions={["Inventory"]}>
                    <Inventory />
                  </ProtectedRoute>
                } />
                <Route path="/store" element={
                  <ProtectedRoute requiredPermissions={["Store Management"]}>
                    <Store />
                  </ProtectedRoute>
                } />
                <Route path="/milling" element={
                  <ProtectedRoute requiredPermissions={["Milling"]}>
                    <Milling />
                  </ProtectedRoute>
                } />
                <Route path="/sales-marketing" element={
                  <ProtectedRoute requiredPermissions={["Sales Marketing"]}>
                    <SalesMarketing />
                  </ProtectedRoute>
                } />
                <Route path="/finance" element={
                  <ProtectedRoute requiredPermissions={["Finance"]}>
                    <Finance />
                  </ProtectedRoute>
                } />
                <Route path="/human-resources" element={
                  <ProtectedRoute requiredPermissions={["Human Resources"]}>
                    <HumanResources />
                  </ProtectedRoute>
                } />
                <Route path="/data-analyst" element={
                  <ProtectedRoute requiredPermissions={["Data Analysis"]}>
                    <DataAnalyst />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute requiredPermissions={["Reports"]}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/logistics" element={
                  <ProtectedRoute requiredPermissions={["Logistics"]}>
                    <Logistics />
                  </ProtectedRoute>
                } />
                <Route path="/field-operations" element={
                  <ProtectedRoute requiredPermissions={["Field Operations"]}>
                    <FieldOperations />
                  </ProtectedRoute>
                } />
                <Route path="/processing" element={
                  <ProtectedRoute requiredPermissions={["Processing"]}>
                    <Processing />
                  </ProtectedRoute>
                } />
                <Route path="/it-department" element={
                  <ProtectedRoute requiredPermissions={["IT Management"]}>
                    <ITDepartment />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/permissions" element={
                  <ProtectedRoute requiredPermissions={["Permissions Management"]}>
                    <PermissionManagement />
                  </ProtectedRoute>
                } />
                <Route path="/expenses" element={
                  <ProtectedRoute>
                    <Expenses />
                  </ProtectedRoute>
                } />
                <Route path="/eudr-documentation" element={
                  <ProtectedRoute requiredPermissions={["EUDR Documentation", "Store Management"]}>
                    <EURDocumentationPage />
                  </ProtectedRoute>
                } />
                <Route path="/suppliers" element={
                  <ProtectedRoute>
                    <Suppliers />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PriceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
