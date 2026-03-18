import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, ShieldCheck, BarChart3, FileText } from "lucide-react";
import FieldOverviewTab from "@/components/v2/field-operations/tabs/FieldOverviewTab";
import DataVerificationTab from "@/components/v2/field-operations/tabs/DataVerificationTab";
import SourcingTrendsTab from "@/components/v2/field-operations/tabs/SourcingTrendsTab";
import FieldReportsTab from "@/components/v2/field-operations/tabs/FieldReportsTab";

const tabs = [
  { id: "overview", label: "Overview", icon: MapPin },
  { id: "verification", label: "Data Verification", icon: ShieldCheck },
  { id: "trends", label: "Sourcing Trends", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: FileText },
];

const FieldOperationsDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Field Operations</h1>
            <p className="text-muted-foreground mt-1">Farmers, purchases & field data management</p>
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
              <TabsContent value="overview"><FieldOverviewTab /></TabsContent>
              <TabsContent value="verification"><DataVerificationTab /></TabsContent>
              <TabsContent value="trends"><SourcingTrendsTab /></TabsContent>
              <TabsContent value="reports"><FieldReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldOperationsDashboard;
