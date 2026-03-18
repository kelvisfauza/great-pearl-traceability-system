import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardCheck, AlertTriangle, GitCompare, FileText, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import CoffeeReceiptsTable from "@/components/v2/store/CoffeeReceiptsTable";
import NewCoffeeReceiptDialog from "@/components/v2/store/NewCoffeeReceiptDialog";
import StockVerificationTab from "@/components/v2/store/tabs/StockVerificationTab";
import DamagedBagsTab from "@/components/v2/store/tabs/DamagedBagsTab";
import ReconciliationTab from "@/components/v2/store/tabs/ReconciliationTab";
import StoreReportsTab from "@/components/v2/store/tabs/StoreReportsTab";
import { Plus } from "lucide-react";
import { useState as useDialogState } from "react";

const tabs = [
  { id: "receipts", label: "Receipts", icon: Package },
  { id: "verification", label: "Verification", icon: ClipboardCheck },
  { id: "damaged", label: "Damaged Bags", icon: AlertTriangle },
  { id: "reconciliation", label: "Reconciliation", icon: GitCompare },
  { id: "reports", label: "Reports", icon: FileText },
];

const CoffeeReceipts = () => {
  const [activeTab, setActiveTab] = useState("receipts");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
          {isMobile && (
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild><Button variant="outline" size="icon"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0"><div className="p-4"><V2Navigation /></div></SheetContent>
            </Sheet>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Store Department</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Coffee receiving, verification & stock management</p>
          </div>
          <div className="hidden md:block"><PriceTicker /></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {!isMobile && <div className="lg:col-span-1"><V2Navigation /></div>}
          <div className={isMobile ? "col-span-1" : "lg:col-span-4"}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                  {tabs.map(tab => (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1.5">
                      <tab.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {activeTab === "receipts" && (
                  <Button size="sm" onClick={() => setShowNewDialog(true)}><Plus className="mr-1 h-4 w-4" />New Receipt</Button>
                )}
              </div>
              <TabsContent value="receipts"><CoffeeReceiptsTable /><NewCoffeeReceiptDialog open={showNewDialog} onOpenChange={setShowNewDialog} /></TabsContent>
              <TabsContent value="verification"><StockVerificationTab /></TabsContent>
              <TabsContent value="damaged"><DamagedBagsTab /></TabsContent>
              <TabsContent value="reconciliation"><ReconciliationTab /></TabsContent>
              <TabsContent value="reports"><StoreReportsTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoffeeReceipts;
