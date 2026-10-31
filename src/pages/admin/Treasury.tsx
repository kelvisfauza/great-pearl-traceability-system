import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Landmark, ArrowLeftRight, Smartphone, HandCoins, Users, ShieldCheck } from "lucide-react";
import TreasuryAccountsPanel from "@/components/admin/TreasuryAccountsPanel";
import TreasuryTransactions from "@/components/admin/TreasuryTransactions";
import TreasuryStaffAccounts from "@/components/admin/TreasuryStaffAccounts";
import TreasuryWorkflows from "@/components/admin/TreasuryWorkflows";
import PoolMomoDepositsPanel from "@/components/admin/PoolMomoDepositsPanel";

const sections = [
  { id: "accounts", label: "Accounts", icon: Landmark },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "deposits", label: "Deposits", icon: Smartphone },
  { id: "loans", label: "Loans & profiles", icon: HandCoins },
  { id: "staff", label: "Salaries & wallets", icon: Users },
  { id: "reconciliation", label: "Reconciliation", icon: ShieldCheck },
];

export default function Treasury() {
  const navigate = useNavigate();
  const [section, setSection] = useState("accounts");
  return <div className="mx-auto max-w-[1500px] p-4 sm:p-6 space-y-6">
    <header className="flex items-center gap-3 border-b pb-5">
      <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-muted-foreground uppercase">Great Agro Coffee / Finance operations</p><h1 className="text-2xl font-semibold flex items-center gap-2 mt-1"><Landmark className="h-6 w-6 text-primary shrink-0" />Treasury Pool</h1></div>
      <span className="hidden sm:block text-xs text-muted-foreground">UGX · Africa/Kampala</span>
    </header>
    <Tabs value={section} onValueChange={setSection}>
      <div className="overflow-x-auto border-b pb-2"><TabsList className="h-auto bg-transparent p-0 gap-1 justify-start min-w-max">{sections.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"><Icon className="h-4 w-4" />{label}</TabsTrigger>)}</TabsList></div>
      <TabsContent value="accounts" className="mt-6"><TreasuryAccountsPanel view="accounts" /></TabsContent>
      <TabsContent value="transactions" className="mt-6"><TreasuryTransactions /></TabsContent>
      <TabsContent value="deposits" className="mt-6"><PoolMomoDepositsPanel canDeposit /></TabsContent>
      <TabsContent value="loans" className="mt-6"><TreasuryWorkflows area="loans" /></TabsContent>
      <TabsContent value="staff" className="mt-6 space-y-6"><TreasuryWorkflows area="staff" /><TreasuryStaffAccounts /></TabsContent>
      <TabsContent value="reconciliation" className="mt-6"><TreasuryAccountsPanel view="reconciliation" /></TabsContent>
    </Tabs>
  </div>;
}
