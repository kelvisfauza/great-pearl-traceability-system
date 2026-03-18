import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Package, AlertTriangle, FileText } from "lucide-react";
import VehicleTrackingTab from "@/components/v2/logistics/tabs/VehicleTrackingTab";
import ShipmentsTab from "@/components/v2/logistics/tabs/ShipmentsTab";
import DelayMonitoringTab from "@/components/v2/logistics/tabs/DelayMonitoringTab";
import LogisticsReportsTab from "@/components/v2/logistics/tabs/LogisticsReportsTab";

const tabs = [
  { id: "vehicles", label: "Vehicles", icon: Truck },
  { id: "shipments", label: "Shipments", icon: Package },
  { id: "delays", label: "Delays", icon: AlertTriangle },
  { id: "reports", label: "Reports", icon: FileText },
];

const LogisticsDashboard = () => {
  const [activeTab, setActiveTab] = useState("vehicles");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logistics Department</h1>
            <p className="text-muted-foreground mt-1">Fleet management, shipments & delivery tracking</p>
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
              <TabsContent value="vehicles"><VehicleTrackingTab /></TabsContent>
              <TabsContent value="shipments"><ShipmentsTab /></TabsContent>
              <TabsContent value="delays"><DelayMonitoringTab /></TabsContent>
              <TabsContent value="reports"><LogisticsReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsDashboard;
