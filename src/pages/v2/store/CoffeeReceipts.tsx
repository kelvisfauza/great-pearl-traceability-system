import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import V2Navigation from "@/components/v2/V2Navigation";
import CoffeeReceiptsTable from "@/components/v2/store/CoffeeReceiptsTable";
import NewCoffeeReceiptDialog from "@/components/v2/store/NewCoffeeReceiptDialog";
import PriceTicker from "@/components/PriceTicker";
import { useIsMobile } from "@/hooks/use-mobile";

const CoffeeReceipts = () => {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6">
        {/* Mobile Header */}
        <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
          {isMobile && (
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="p-4">
                  <V2Navigation />
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-foreground truncate">
              Store Management
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 hidden sm:block">
              Register and manage coffee receipts
            </p>
          </div>
          
          <div className="hidden md:block">
            <PriceTicker />
          </div>
        </div>

        {/* Mobile Price Ticker */}
        {isMobile && (
          <div className="mb-4">
            <PriceTicker />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="lg:col-span-1">
              <V2Navigation />
            </div>
          )}

          <div className={isMobile ? "col-span-1" : "lg:col-span-3"}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">Coffee Receipts</CardTitle>
                <Button 
                  onClick={() => setShowNewDialog(true)}
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Receipt</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                <CoffeeReceiptsTable />
              </CardContent>
            </Card>
          </div>
        </div>

        <NewCoffeeReceiptDialog 
          open={showNewDialog}
          onOpenChange={setShowNewDialog}
        />
      </div>
    </div>
  );
};

export default CoffeeReceipts;
