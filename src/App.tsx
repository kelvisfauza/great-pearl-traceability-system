
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PriceProvider } from "@/contexts/PriceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Procurement from "./pages/Procurement";
import QualityControl from "./pages/QualityControl";
import Processing from "./pages/Processing";
import Inventory from "./pages/Inventory";
import Store from "./pages/Store";
import SalesMarketing from "./pages/SalesMarketing";
import Finance from "./pages/Finance";
import FieldOperations from "./pages/FieldOperations";
import HumanResources from "./pages/HumanResources";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Logistics from "./pages/Logistics";
import DataAnalyst from "./pages/DataAnalyst";

const App: React.FC = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PriceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/procurement" element={
                  <ProtectedRoute>
                    <Procurement />
                  </ProtectedRoute>
                } />
                <Route path="/quality-control" element={
                  <ProtectedRoute>
                    <QualityControl />
                  </ProtectedRoute>
                } />
                <Route path="/processing" element={
                  <ProtectedRoute>
                    <Processing />
                  </ProtectedRoute>
                } />
                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <Inventory />
                  </ProtectedRoute>
                } />
                <Route path="/store" element={
                  <ProtectedRoute>
                    <Store />
                  </ProtectedRoute>
                } />
                <Route path="/sales-marketing" element={
                  <ProtectedRoute>
                    <SalesMarketing />
                  </ProtectedRoute>
                } />
                <Route path="/finance" element={
                  <ProtectedRoute>
                    <Finance />
                  </ProtectedRoute>
                } />
                <Route path="/field-operations" element={
                  <ProtectedRoute>
                    <FieldOperations />
                  </ProtectedRoute>
                } />
                <Route path="/human-resources" element={
                  <ProtectedRoute>
                    <HumanResources />
                  </ProtectedRoute>
                } />
                <Route path="/data-analyst" element={
                  <ProtectedRoute>
                    <DataAnalyst />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/logistics" element={
                  <ProtectedRoute>
                    <Logistics />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
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
