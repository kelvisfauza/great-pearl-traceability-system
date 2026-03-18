import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, DollarSign, TrendingUp, FileCheck, FileText, Users, ShoppingCart, GitCompare, BookOpen, BarChart3, Landmark, Handshake } from "lucide-react";
import ProcurementOverviewTab from "@/components/v2/procurement/tabs/ProcurementOverviewTab";
import SupplierRecordsTab from "@/components/v2/procurement/tabs/SupplierRecordsTab";
import OrderTrackingTab from "@/components/v2/procurement/tabs/OrderTrackingTab";
import PricingVerificationTab from "@/components/v2/procurement/tabs/PricingVerificationTab";
import SupplierPerformanceTab from "@/components/v2/procurement/tabs/SupplierPerformanceTab";
import DocumentationTab from "@/components/v2/procurement/tabs/DocumentationTab";
import CrossDepartmentTab from "@/components/v2/procurement/tabs/CrossDepartmentTab";
import ProcurementReportsTab from "@/components/v2/procurement/tabs/ProcurementReportsTab";
import BuyerContractsTab from "@/components/v2/procurement/tabs/BuyerContractsTab";
import SupplierContractsTab from "@/components/v2/procurement/tabs/SupplierContractsTab";
import BookingsTab from "@/components/v2/procurement/tabs/BookingsTab";
import BuyingPriceAnalysisTab from "@/components/v2/procurement/tabs/BuyingPriceAnalysisTab";

const tabs = [
  { id: "overview", label: "Overview", icon: ShoppingBag },
  { id: "sales-contracts", label: "Sales Contracts", icon: FileText },
  { id: "supplier-contracts", label: "Supplier Contracts", icon: Handshake },
  { id: "suppliers", label: "Suppliers", icon: Users },
  { id: "bookings", label: "Bookings", icon: BookOpen },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "buying-analysis", label: "Price Analysis", icon: BarChart3 },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "docs", label: "Docs", icon: FileCheck },
  { id: "workflow", label: "Workflow", icon: GitCompare },
  { id: "reports", label: "Reports", icon: Landmark },
];

const ProcurementDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Procurement Department</h1>
            <p className="text-muted-foreground mt-1">Suppliers, orders, contracts, pricing & cross-department workflow</p>
          </div>
          <PriceTicker />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1"><V2Navigation /></div>
          <div className="lg:col-span-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1.5">
                    <tab.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="overview"><ProcurementOverviewTab /></TabsContent>
              <TabsContent value="sales-contracts"><BuyerContractsTab /></TabsContent>
              <TabsContent value="supplier-contracts"><SupplierContractsTab /></TabsContent>
              <TabsContent value="suppliers"><SupplierRecordsTab /></TabsContent>
              <TabsContent value="bookings"><BookingsTab /></TabsContent>
              <TabsContent value="orders"><OrderTrackingTab /></TabsContent>
              <TabsContent value="pricing"><PricingVerificationTab /></TabsContent>
              <TabsContent value="buying-analysis"><BuyingPriceAnalysisTab /></TabsContent>
              <TabsContent value="performance"><SupplierPerformanceTab /></TabsContent>
              <TabsContent value="docs"><DocumentationTab /></TabsContent>
              <TabsContent value="workflow"><CrossDepartmentTab /></TabsContent>
              <TabsContent value="reports"><ProcurementReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementDashboard;
