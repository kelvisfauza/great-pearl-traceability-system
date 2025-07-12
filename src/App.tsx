import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/quality-control" element={<QualityControl />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/store" element={<Store />} />
          <Route path="/sales-marketing" element={<SalesMarketing />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/field-operations" element={<FieldOperations />} />
          <Route path="/human-resources" element={<HumanResources />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
