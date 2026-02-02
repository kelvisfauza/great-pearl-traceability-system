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
import Approvals from "./pages/Approvals";
import Verify from "./pages/Verify";

// V2 System Pages
import V2DepartmentRouter from "./components/v2/V2DepartmentRouter";
import V2CoffeeReceipts from "./pages/v2/store/CoffeeReceipts";
import V2PendingLots from "./pages/v2/quality/PendingLots";
import V2AssessLot from "./pages/v2/quality/AssessLot";
import V2InventoryIndex from "./pages/v2/inventory/Index";
import V2SalesIndex from "./pages/v2/sales/Index";
import V2AdminDashboard from "./pages/v2/admin/Dashboard";
import V2FinanceDashboard from "./pages/v2/finance/Dashboard";
import V2HRDashboard from "./pages/v2/hr/Dashboard";
import V2HRSalaryAdvances from "./pages/v2/hr/SalaryAdvances";
import V2FieldOpsDashboard from "./pages/v2/field-operations/Dashboard";
import V2AnalyticsDashboard from "./pages/v2/analytics/Dashboard";
import V2EUDRDashboard from "./pages/v2/eudr/Dashboard";
import V2LogisticsDashboard from "./pages/v2/logistics/Dashboard";
import V2ProcessingDashboard from "./pages/v2/processing/Dashboard";
import V2MillingDashboard from "./pages/v2/milling/Dashboard";
import V2ProcurementDashboard from "./pages/v2/procurement/Dashboard";
import V2ITDashboard from "./pages/v2/it/Dashboard";

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
import EUDRDispatchReports from "./pages/reports/EUDRDispatchReports";
import SystemSettings from "./pages/admin/SystemSettings";
import UserDailyReports from "./pages/UserDailyReports";
import { DailyReportReminder } from "./components/reports/DailyReportReminder";
import { MonthlyReportReminder } from "./components/reports/MonthlyReportReminder";
import { GlobalActivityTracker } from "./components/GlobalActivityTracker";
import { OvertimeNotification } from "./components/OvertimeNotification";
import RoleNotificationHandler from "./components/RoleNotificationHandler";
import ChristmasGiftBox from "./components/christmas/ChristmasGiftBox";
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import GlobalErrorCaptureInitializer from './components/GlobalErrorCaptureInitializer';

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
        <GlobalErrorCaptureInitializer />
        <InactivityTimerInitializer />
        <GlobalActivityTracker />
        <PriceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {/* Global notifications and reminders */}
              <OvertimeNotification />
              <DailyReportReminder />
              <MonthlyReportReminder />
              <ChristmasGiftBox />
              {/* <RoleNotificationHandler /> - Disabled due to performance issues */}
              
              <Routes>
                <Route path="/auth" element={<Auth />} />
                
                {/* Public verification route - no auth required */}
                <Route path="/verify" element={<Verify />} />
                <Route path="/verify/:code" element={<Verify />} />
                
                {/* V2 System Routes - Department-based access */}
                <Route path="/v2" element={<ProtectedRoute><V2DepartmentRouter /></ProtectedRoute>} />
                <Route path="/v2/admin" element={<ProtectedRoute requiredRoles={["Administrator", "Super Admin"]}><V2AdminDashboard /></ProtectedRoute>} />
                <Route path="/v2/store" element={<ProtectedRoute requiredPermissions={["Store Management"]}><V2CoffeeReceipts /></ProtectedRoute>} />
                <Route path="/v2/quality" element={<ProtectedRoute requiredPermissions={["Quality Control"]}><V2PendingLots /></ProtectedRoute>} />
                <Route path="/v2/quality/assess/:id" element={<ProtectedRoute requiredPermissions={["Quality Control"]}><V2AssessLot /></ProtectedRoute>} />
                <Route path="/v2/inventory" element={<ProtectedRoute requiredPermissions={["Inventory", "Store Management"]}><V2InventoryIndex /></ProtectedRoute>} />
                <Route path="/v2/sales" element={<ProtectedRoute requiredPermissions={["Sales Marketing"]}><V2SalesIndex /></ProtectedRoute>} />
                <Route path="/v2/finance" element={<ProtectedRoute requiredPermissions={["Finance"]}><V2FinanceDashboard /></ProtectedRoute>} />
                <Route path="/v2/hr" element={<ProtectedRoute requiredPermissions={["Human Resources"]}><V2HRDashboard /></ProtectedRoute>} />
                <Route path="/v2/hr/salary-advances" element={<ProtectedRoute requiredPermissions={["Human Resources"]} requiredRoles={["Administrator", "Super Admin"]}><V2HRSalaryAdvances /></ProtectedRoute>} />
                <Route path="/v2/field-operations" element={<ProtectedRoute requiredPermissions={["Field Operations"]}><V2FieldOpsDashboard /></ProtectedRoute>} />
                <Route path="/v2/analytics" element={<ProtectedRoute requiredPermissions={["Data Analysis"]}><V2AnalyticsDashboard /></ProtectedRoute>} />
                <Route path="/v2/eudr" element={<ProtectedRoute requiredPermissions={["EUDR Documentation", "Store Management"]}><V2EUDRDashboard /></ProtectedRoute>} />
                <Route path="/v2/logistics" element={<ProtectedRoute requiredPermissions={["Logistics"]}><V2LogisticsDashboard /></ProtectedRoute>} />
                <Route path="/v2/processing" element={<ProtectedRoute requiredPermissions={["Processing"]}><V2ProcessingDashboard /></ProtectedRoute>} />
                <Route path="/v2/milling" element={<ProtectedRoute requiredPermissions={["Milling"]}><V2MillingDashboard /></ProtectedRoute>} />
                <Route path="/v2/procurement" element={<ProtectedRoute requiredPermissions={["Procurement"]}><V2ProcurementDashboard /></ProtectedRoute>} />
                <Route path="/v2/it" element={<ProtectedRoute requiredPermissions={["IT Management"]}><V2ITDashboard /></ProtectedRoute>} />
                
                {/* V1 System Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/approvals" element={
                  <ProtectedRoute>
                    <Approvals />
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
                <Route path="/user-daily-reports" element={
                  <ProtectedRoute>
                    <UserDailyReports />
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
                <Route path="/reports/eudr-dispatch" element={
                  <ProtectedRoute requiredRoles={['Manager', 'Administrator', 'Super Admin']}>
                    <EUDRDispatchReports />
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
