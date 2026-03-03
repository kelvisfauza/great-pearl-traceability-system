import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { MapPin } from "lucide-react";

const FieldOpsSummarySection = ({ data }: { data: WholeBusinessData["fieldOps"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-emerald-600" /> Field Operations
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Field Agents</p>
          <p className="text-xl font-bold">{data.activeAgents} / {data.totalAgents}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Collections</p>
          <p className="text-xl font-bold">{data.totalCollections}</p>
          <p className="text-sm text-muted-foreground">{data.totalCollectionKg.toLocaleString()} kg</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Registered Farmers</p>
          <p className="text-xl font-bold">{data.totalFarmers}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Field Purchases</p>
          <p className="text-xl font-bold">{data.totalFieldPurchases}</p>
          <p className="text-sm text-muted-foreground">UGX {data.totalFieldPurchaseAmount.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Daily Reports</p>
          <p className="text-xl font-bold">{data.totalDailyReports}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default FieldOpsSummarySection;
