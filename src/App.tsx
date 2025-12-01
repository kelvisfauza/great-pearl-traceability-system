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
import MyExpenses from "./pages/MyExpenses";
import EURDocumentationPage from "./pages/EUDRDocumentation";
import Suppliers from "./pages/Suppliers";

// V2 System Pages
import V2Index from "./pages/v2/Index";
import V2CoffeeReceipts from "./pages/v2/store/CoffeeReceipts";
import V2PendingLots from "./pages/v2/quality/PendingLots";
import V2AssessLot from "./pages/v2/quality/AssessLot";

import FinanceReport from "./pages/reports/FinanceReport";
import DayBookReport from "./pages/reports/DayBookReport";
import ExpensesReport from "./pages/reports/ExpensesReport";
import ReconciliationReport from "./pages/reports/ReconciliationReport";
import RiskReport from "./pages/reports/RiskReport";
import StoreReports from "./pages/reports/StoreReports";
import SalesReports from "./pages/reports/SalesReports";
import AnalyticsReport from "./pages/reports/AnalyticsReport";
import GenerateReport from "./pages/reports/GenerateReport";
import FieldOperationsReport from "./pages/reports/FieldOperationsReport";
import ComparisonReport from "./pages/reports/ComparisonReport";
import SystemSettings from "./pages/admin/SystemSettings";
import { GlobalActivityTracker } from "./components/GlobalActivityTracker";
import { OvertimeNotification } from "./components/OvertimeNotification";
import RoleNotificationHandler from "./components/RoleNotificationHandler";
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Disabled: Error Handler was causing infinite loops and performance issues
// const ErrorHandlerInitializer = () => {
//   const { initializeErrorHandlers } = useGlobalErrorHandler();
//   
//   useEffect(() => {
//     initializeErrorHandlers();
//   }, []);
//   
//   return null;
// };

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
        {/* <ErrorHandlerInitializer /> */}
        <InactivityTimerInitializer />
        <GlobalActivityTracker />
        <PriceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {/* OvertimeNotification moved inside Router context */}
              <OvertimeNotification />
              {/* <RoleNotificationHandler /> - Disabled due to performance issues */}
              
              <Routes>
                <Route path="/auth" element={<Auth />} />
                
                {/* V2 System Routes */}
                <Route path="/v2" element={
                  <ProtectedRoute>
                    <V2Index />
                  </ProtectedRoute>
                } />
                <Route path="/v2/store" element={
                  <ProtectedRoute requiredPermissions={["Store Management"]}>
                    <V2CoffeeReceipts />
                  </ProtectedRoute>
                } />
                <Route path="/v2/quality" element={
                  <ProtectedRoute requiredPermissions={["Quality Control"]}>
                    <V2PendingLots />
                  </ProtectedRoute>
                } />
                <Route path="/v2/quality/assess/:id" element={
                  <ProtectedRoute requiredPermissions={["Quality Control"]}>
                    <V2AssessLot />
                  </ProtectedRoute>
                } />
                
                {/* V1 System Routes */}
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
                {/* ❌ Finance route disabled - will be used in separate Finance portal */}
                {/* <Route path="/finance" element={
                  <ProtectedRoute requiredPermissions={["Finance"]}>
                    <Finance />
                  </ProtectedRoute>
                } /> */}
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
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
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
                <Route path="/my-expenses" element={
                  <ProtectedRoute>
                    <MyExpenses />
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
                <Route path="/reports/finance" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <FinanceReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/daybook" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <DayBookReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/expenses" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <ExpensesReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/reconciliation" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <ReconciliationReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/risk" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <RiskReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/store" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <StoreReports />
                  </ProtectedRoute>
                } />
                <Route path="/reports/sales" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <SalesReports />
                  </ProtectedRoute>
                } />
                <Route path="/reports/analytics" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <AnalyticsReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/generator" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <GenerateReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/field-operations" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <FieldOperationsReport />
                  </ProtectedRoute>
                } />
                <Route path="/reports/comparison" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <ComparisonReport />
                  </ProtectedRoute>
                } />
                <Route path="/admin/system-settings" element={
                  <ProtectedRoute requiredRoles={['Super Admin']}>
                    <SystemSettings />
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
