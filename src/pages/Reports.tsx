
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KeyMetrics from "@/components/reports/KeyMetrics";
import ReportGenerator from "@/components/reports/ReportGenerator";
import PrintReportGenerator from "@/components/reports/PrintReportGenerator";
import StorePrintReportGenerator from "@/components/reports/StorePrintReportGenerator";
import PerformanceDashboard from "@/components/reports/PerformanceDashboard";
import RecentReports from "@/components/reports/RecentReports";
import StoreReportForm from "@/components/reports/StoreReportForm";
import StoreReportsList from "@/components/reports/StoreReportsList";
import SalesReportsList from "@/components/reports/SalesReportsList";
import DayBook from "@/components/reports/DayBook";
import MonthlyReconciliation from "@/components/reports/MonthlyReconciliation";
import { ExpensesReport } from "@/components/reports/ExpensesReport";
import { RefreshMetricsButton } from "@/components/reports/RefreshMetricsButton";
import { BarChart3, FileText, TrendingUp, History, Store, Printer, ShoppingCart, BookOpen, Calculator, Receipt } from "lucide-react";

const Reports = () => {
  return (
    <Layout 
      title="Reports & Analytics" 
      subtitle="Generate comprehensive reports and analyze business performance"
    >
      <div className="space-y-6">
        {/* Main Content Tabs - Lazy Load Components for Performance */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-10">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="daybook" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Day Book
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Reports
            </TabsTrigger>
            <TabsTrigger value="print" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Report History
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Store Reports
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sales Reports
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Monthly Reconciliation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1">
                <KeyMetrics />
              </div>
              <RefreshMetricsButton />
            </div>
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="daybook" className="space-y-6">
            <DayBook />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <ExpensesReport />
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <ReportGenerator />
          </TabsContent>

          <TabsContent value="print" className="space-y-6">
            <PrintReportGenerator />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <RecentReports />
          </TabsContent>

          <TabsContent value="store" className="space-y-6">
            <div className="grid gap-6">
              <StoreReportForm />
              <StorePrintReportGenerator />
              <StoreReportsList />
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <SalesReportsList />
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-6">
            <MonthlyReconciliation />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
