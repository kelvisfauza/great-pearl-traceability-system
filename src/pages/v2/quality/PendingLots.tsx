import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import V2Navigation from "@/components/v2/V2Navigation";
import PendingLotsTable from "@/components/v2/quality/PendingLotsTable";
import PriceTicker from "@/components/PriceTicker";

const PendingLots = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quality Control</h1>
            <p className="text-muted-foreground mt-2">
              Review and assess pending coffee lots
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
              <CardHeader>
                <CardTitle>Pending Quality Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <PendingLotsTable />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingLots;
