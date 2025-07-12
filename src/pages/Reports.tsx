
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KeyMetrics from "@/components/reports/KeyMetrics";
import ReportGenerator from "@/components/reports/ReportGenerator";
import PerformanceDashboard from "@/components/reports/PerformanceDashboard";
import RecentReports from "@/components/reports/RecentReports";
import { BarChart3, FileText, TrendingUp, History } from "lucide-react";

const Reports = () => {
  return (
    <Layout 
      title="Reports & Analytics" 
      subtitle="Generate comprehensive reports and analyze business performance"
    >
      <div className="space-y-6">
        {/* Key Metrics Overview */}
        <KeyMetrics />

        {/* Main Content Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Report History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <ReportGenerator />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <RecentReports />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
