import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { ShoppingCart } from "lucide-react";

const SalesSummarySection = ({ data }: { data: WholeBusinessData["sales"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-pink-600" /> Sales & Marketing
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Transactions</p>
          <p className="text-xl font-bold">{data.totalTransactions}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-green-600">UGX {data.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Weight Sold (kg)</p>
          <p className="text-xl font-bold">{data.totalWeightKg.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Unique Customers</p>
          <p className="text-xl font-bold">{data.uniqueCustomers}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Buyer Contracts</p>
          <p className="text-xl font-bold">{data.activeBuyerContracts} / {data.totalBuyerContracts}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Contract Value</p>
          <p className="text-xl font-bold">UGX {data.totalContractValue.toLocaleString()}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default SalesSummarySection;
