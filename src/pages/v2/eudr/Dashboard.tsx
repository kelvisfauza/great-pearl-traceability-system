import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Link2, FileWarning, Shield } from "lucide-react";
import BatchTraceabilityTab from "@/components/v2/eudr/tabs/BatchTraceabilityTab";
import MissingDocsTab from "@/components/v2/eudr/tabs/MissingDocsTab";
import ComplianceReportsTab from "@/components/v2/eudr/tabs/ComplianceReportsTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Package } from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: FileCheck },
  { id: "traceability", label: "Traceability", icon: Link2 },
  { id: "missing", label: "Missing Docs", icon: FileWarning },
  { id: "compliance", label: "Compliance", icon: Shield },
];

const EUDRDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["eudr-v2-stats"],
    queryFn: async () => {
      const [documents, batches] = await Promise.all([
        supabase.from("eudr_documents").select("status"),
        supabase.from("eudr_batches").select("status"),
      ]);
      return {
        activeDocuments: documents.data?.filter(d => d.status === 'active').length || 0,
        activeBatches: batches.data?.filter(b => b.status === 'available').length || 0,
        totalDocuments: documents.data?.length || 0,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">EUDR Compliance</h1>
            <p className="text-muted-foreground mt-1">Deforestation regulation compliance & traceability</p>
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
              <TabsContent value="overview">
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active Documents</p><p className="text-2xl font-bold text-green-600">{stats?.activeDocuments || 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Available Batches</p><p className="text-2xl font-bold text-blue-600">{stats?.activeBatches || 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Documents</p><p className="text-2xl font-bold">{stats?.totalDocuments || 0}</p></CardContent></Card>
                </div>
              </TabsContent>
              <TabsContent value="traceability"><BatchTraceabilityTab /></TabsContent>
              <TabsContent value="missing"><MissingDocsTab /></TabsContent>
              <TabsContent value="compliance"><ComplianceReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EUDRDashboard;
