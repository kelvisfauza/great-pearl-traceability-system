import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import V2Navigation from "@/components/v2/V2Navigation";
import StockOverview from "@/components/v2/inventory/StockOverview";
import MovementsLog from "@/components/v2/inventory/MovementsLog";
import { Package } from "lucide-react";

const InventoryIndex = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Track physical stock levels and movements
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3">
            <Tabs defaultValue="stock" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stock">Current Stock</TabsTrigger>
                <TabsTrigger value="movements">Movement History</TabsTrigger>
              </TabsList>

              <TabsContent value="stock">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StockOverview />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="movements">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Movements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MovementsLog />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryIndex;
