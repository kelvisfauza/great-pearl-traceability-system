import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Lightbulb, FileText } from "lucide-react";
import MarketPricesTab from "@/components/v2/analytics/tabs/MarketPricesTab";
import SupplierAnalysisTab from "@/components/v2/analytics/tabs/SupplierAnalysisTab";
import AnalystRecommendationsTab from "@/components/v2/analytics/tabs/AnalystRecommendationsTab";
import MarketReportsTab from "@/components/v2/analytics/tabs/MarketReportsTab";

const tabs = [
  { id: "prices", label: "Market Prices", icon: TrendingUp },
  { id: "analysis", label: "Supplier Analysis", icon: BarChart3 },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
  { id: "reports", label: "Reports", icon: FileText },
];

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState("prices");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Data Analytics</h1>
            <p className="text-muted-foreground mt-1">Market intelligence, supplier analysis & recommendations</p>
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
              <TabsContent value="prices"><MarketPricesTab /></TabsContent>
              <TabsContent value="analysis"><SupplierAnalysisTab /></TabsContent>
              <TabsContent value="recommendations"><AnalystRecommendationsTab /></TabsContent>
              <TabsContent value="reports"><MarketReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
