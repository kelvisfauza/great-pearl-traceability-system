import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, GitCompare, ArrowDownUp, Search, FileText, CreditCard } from "lucide-react";
import FinanceOverviewTab from "@/components/v2/finance/tabs/FinanceOverviewTab";
import PendingPaymentsTab from "@/components/v2/finance/tabs/PendingPaymentsTab";
import TransactionReconciliationTab from "@/components/v2/finance/tabs/TransactionReconciliationTab";
import AdvancesRecoveriesTab from "@/components/v2/finance/tabs/AdvancesRecoveriesTab";
import DuplicateDetectionTab from "@/components/v2/finance/tabs/DuplicateDetectionTab";
import FinanceReportsTab from "@/components/v2/finance/tabs/FinanceReportsTab";

const tabs = [
  { id: "overview", label: "Overview", icon: Wallet },
  { id: "payments", label: "Pending Payments", icon: CreditCard },
  { id: "reconciliation", label: "Reconciliation", icon: GitCompare },
  { id: "advances", label: "Advances", icon: ArrowDownUp },
  { id: "duplicates", label: "Duplicates", icon: Search },
  { id: "reports", label: "Reports", icon: FileText },
];

const FinanceDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Finance Department</h1>
            <p className="text-muted-foreground mt-1">Payments, reconciliation & financial reporting</p>
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
              <TabsContent value="overview"><FinanceOverviewTab /></TabsContent>
              <TabsContent value="payments"><PendingPaymentsTab /></TabsContent>
              <TabsContent value="reconciliation"><TransactionReconciliationTab /></TabsContent>
              <TabsContent value="advances"><AdvancesRecoveriesTab /></TabsContent>
              <TabsContent value="duplicates"><DuplicateDetectionTab /></TabsContent>
              <TabsContent value="reports"><FinanceReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
