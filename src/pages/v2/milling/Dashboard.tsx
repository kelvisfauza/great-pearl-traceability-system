import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cog, BookOpen, GitCompare, BarChart3, FileText } from "lucide-react";
import MillingTransactionsTab from "@/components/v2/milling/tabs/MillingTransactionsTab";
import CustomerLedgersTab from "@/components/v2/milling/tabs/CustomerLedgersTab";
import MillingAnalyticsTab from "@/components/v2/milling/tabs/MillingAnalyticsTab";
import MillingReportsTab from "@/components/v2/milling/tabs/MillingReportsTab";

const tabs = [
  { id: "transactions", label: "Transactions", icon: Cog },
  { id: "ledgers", label: "Customer Ledgers", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: FileText },
];

const MillingDashboard = () => {
  const [activeTab, setActiveTab] = useState("transactions");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Milling Department</h1>
            <p className="text-muted-foreground mt-1">Milling operations, customer accounts & reporting</p>
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
              <TabsContent value="transactions"><MillingTransactionsTab /></TabsContent>
              <TabsContent value="ledgers"><CustomerLedgersTab /></TabsContent>
              <TabsContent value="analytics"><MillingAnalyticsTab /></TabsContent>
              <TabsContent value="reports"><MillingReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MillingDashboard;
