
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import FinanceMonthlyReport from "@/components/reports/FinanceMonthlyReport";
import RiskAssessmentReport from "@/components/reports/RiskAssessmentReport";
import { FieldOperationsManagement } from "@/components/admin/FieldOperationsManagement";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, FileText, TrendingUp, Store, ShoppingCart, BookOpen, Calculator, Receipt, Wallet, AlertTriangle, MapPin } from "lucide-react";

const Reports = () => {
  const { employee } = useAuth();
  const isAdmin = employee?.role === 'Administrator' || employee?.role === 'Super Admin';

  return (
    <Layout 
      title="Reports & Analytics" 
      subtitle="Comprehensive business intelligence and reporting"
    >
      <div className="space-y-8">
        {/* Quick Overview Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
            <RefreshMetricsButton />
          </div>
          <KeyMetrics />
        </div>

        {/* Main Reports Section */}
        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2 h-auto bg-muted/50 p-1">
            <TabsTrigger value="financial" className="data-[state=active]:bg-background">
              <Wallet className="h-4 w-4 mr-2" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="operations" className="data-[state=active]:bg-background">
              <Store className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-background">
              <FileText className="h-4 w-4 mr-2" />
              Generate
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-background">
                <MapPin className="h-4 w-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Financial Reports Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Finance Report
                  </CardTitle>
                  <CardDescription>Monthly financial overview and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <FinanceMonthlyReport />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Day Book
                  </CardTitle>
                  <CardDescription>Daily transaction records</CardDescription>
                </CardHeader>
                <CardContent>
                  <DayBook />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Expenses
                  </CardTitle>
                  <CardDescription>Track and analyze expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpensesReport />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Reconciliation
                  </CardTitle>
                  <CardDescription>Monthly account reconciliation</CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyReconciliation />
                </CardContent>
              </Card>
            </div>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Risk Assessment
                </CardTitle>
                <CardDescription>AI-powered risk analysis and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <RiskAssessmentReport />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Store Reports
                  </CardTitle>
                  <CardDescription>Inventory and store management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StoreReportForm />
                  <StorePrintReportGenerator />
                  <StoreReportsList />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Sales Reports
                  </CardTitle>
                  <CardDescription>Sales performance and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesReportsList />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performance Analytics
                </CardTitle>
                <CardDescription>Business performance metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Reports Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Report Generator
                  </CardTitle>
                  <CardDescription>Create custom reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportGenerator />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Print Reports
                  </CardTitle>
                  <CardDescription>Print-ready report formats</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrintReportGenerator />
                </CardContent>
              </Card>
            </div>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>View and manage generated reports</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentReports />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Tab */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Field Operations
                  </CardTitle>
                  <CardDescription>Manage field operations and reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldOperationsManagement />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
