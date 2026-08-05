import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Cog, Users, BookOpen, CreditCard, TrendingDown, FileText, BarChart3,
  Smartphone, Plus, Receipt, DollarSign, Loader2,
} from "lucide-react";
import { useMillingData } from "@/hooks/useMillingData";
import MillingTransactionsList from "@/components/milling/MillingTransactionsList";
import MillingCustomersList from "@/components/milling/MillingCustomersList";
import MillingCustomerLedger from "@/components/milling/MillingCustomerLedger";
import MillingExpenses from "@/components/milling/MillingExpenses";
import MillingReports from "@/components/milling/MillingReports";
import MillingMoMoTransactions from "@/components/milling/MillingMoMoTransactions";
import { UssdServicesManager } from "@/components/milling/UssdServicesManager";
import MillingCustomerForm from "@/components/milling/MillingCustomerForm";
import MillingTransactionForm from "@/components/milling/MillingTransactionForm";
import MillingCashTransactionForm from "@/components/milling/MillingCashTransactionForm";
import MillingPrintReportModal from "@/components/milling/MillingPrintReportModal";
import MillingMoMoCollectModal from "@/components/milling/MillingMoMoCollectModal";
import MillingAnalyticsTab from "@/components/v2/milling/tabs/MillingAnalyticsTab";

const tabs = [
  { id: "transactions", label: "Transactions", icon: Cog },
  { id: "customers", label: "Customers", icon: Users },
  { id: "ledger", label: "Ledger", icon: BookOpen },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "ussd", label: "USSD", icon: Smartphone },
];

const MillingDashboard = () => {
  const [activeTab, setActiveTab] = useState("transactions");
  const { stats, loading } = useMillingData();
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [showMoMoCollect, setShowMoMoCollect] = useState(false);

  const statCards = [
    { label: "Customers", value: `${stats.totalCustomers}`, hint: `${stats.activeCustomers} active` },
    { label: "Outstanding Debts", value: `UGX ${stats.totalDebts.toLocaleString()}`, hint: "All customers" },
    { label: "Cash Received", value: `UGX ${stats.cashReceived.toLocaleString()}`, hint: "This month" },
    { label: "KGs Hulled", value: `${stats.totalKgsHulled.toLocaleString()} kg`, hint: "This month" },
    { label: "Monthly Revenue", value: `UGX ${stats.monthlyRevenue.toLocaleString()}`, hint: "This month" },
    { label: "Net Revenue", value: `UGX ${stats.netRevenue.toLocaleString()}`, hint: `Expenses UGX ${stats.totalExpenses.toLocaleString()}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Milling Department</h1>
            <p className="text-muted-foreground mt-1">Hulling transactions, customer accounts, payments & reporting</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1"><V2Navigation /></div>
          <div className="lg:col-span-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {statCards.map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-base font-bold break-words">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.hint}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1.5">
                    <tab.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="transactions" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h2 className="text-lg font-semibold">Hulling Transactions</h2>
                  <Button onClick={() => setShowTransactionForm(true)} className="w-full sm:w-auto">
                    <Receipt className="h-4 w-4 mr-2" />New Transaction
                  </Button>
                </div>
                <MillingTransactionsList />
              </TabsContent>

              <TabsContent value="customers" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h2 className="text-lg font-semibold">Customer Management</h2>
                  <Button onClick={() => setShowCustomerForm(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />Add Customer
                  </Button>
                </div>
                <MillingCustomersList />
              </TabsContent>

              <TabsContent value="ledger" className="mt-4"><MillingCustomerLedger /></TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h2 className="text-lg font-semibold">Payments & Collections</h2>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowMoMoCollect(true)}>
                      <Smartphone className="h-4 w-4 mr-2" />Collect via MoMo
                    </Button>
                    <Button onClick={() => setShowCashForm(true)}>
                      <DollarSign className="h-4 w-4 mr-2" />Record Payment
                    </Button>
                  </div>
                </div>
                <MillingMoMoTransactions />
              </TabsContent>

              <TabsContent value="expenses" className="mt-4"><MillingExpenses /></TabsContent>

              <TabsContent value="reports" className="space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h2 className="text-lg font-semibold">Reports</h2>
                  <Button variant="outline" onClick={() => setShowPrintReport(true)}>
                    <FileText className="h-4 w-4 mr-2" />Print Report
                  </Button>
                </div>
                <MillingReports />
              </TabsContent>

              <TabsContent value="analytics" className="mt-4"><MillingAnalyticsTab /></TabsContent>

              <TabsContent value="ussd" className="mt-4"><UssdServicesManager /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {showCustomerForm && <MillingCustomerForm open={showCustomerForm} onClose={() => setShowCustomerForm(false)} />}
      {showTransactionForm && <MillingTransactionForm open={showTransactionForm} onClose={() => setShowTransactionForm(false)} />}
      {showCashForm && <MillingCashTransactionForm open={showCashForm} onClose={() => setShowCashForm(false)} />}
      {showPrintReport && <MillingPrintReportModal open={showPrintReport} onClose={() => setShowPrintReport(false)} />}
      {showMoMoCollect && <MillingMoMoCollectModal open={showMoMoCollect} onClose={() => setShowMoMoCollect(false)} />}
    </div>
  );
};

export default MillingDashboard;
