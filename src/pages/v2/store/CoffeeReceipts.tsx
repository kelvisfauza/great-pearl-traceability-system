import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import V2Navigation from "@/components/v2/V2Navigation";
import CoffeeReceiptsTable from "@/components/v2/store/CoffeeReceiptsTable";
import NewCoffeeReceiptDialog from "@/components/v2/store/NewCoffeeReceiptDialog";
import PriceTicker from "@/components/PriceTicker";

const CoffeeReceipts = () => {
  const [showNewDialog, setShowNewDialog] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Store Management</h1>
            <p className="text-muted-foreground mt-2">
              Register and manage coffee receipts
            </p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Coffee Receipts</CardTitle>
                <Button onClick={() => setShowNewDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Receipt
                </Button>
              </CardHeader>
              <CardContent>
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
