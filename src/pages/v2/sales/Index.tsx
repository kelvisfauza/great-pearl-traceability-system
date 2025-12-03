import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import V2Navigation from "@/components/v2/V2Navigation";
import { ShoppingCart } from "lucide-react";
import SalesTransactionsList from "@/components/v2/sales/SalesTransactionsList";
import NewSaleForm from "@/components/v2/sales/NewSaleForm";

const SalesIndex = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="h-8 w-8 text-pink-600" />
            <h1 className="text-3xl font-bold text-foreground">Sales Management</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage customer sales and track transactions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3">
            <Tabs defaultValue="transactions" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions">Sales History</TabsTrigger>
                <TabsTrigger value="new">New Sale</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SalesTransactionsList />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="new">
                <Card>
                  <CardHeader>
                    <CardTitle>Record New Sale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NewSaleForm />
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

export default SalesIndex;
