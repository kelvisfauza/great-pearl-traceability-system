import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { CheckCircle } from "lucide-react";

const QualitySummarySection = ({ data }: { data: WholeBusinessData["quality"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-teal-600" /> Quality Control
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Assessments</p>
          <p className="text-xl font-bold">{data.totalAssessments}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="text-xl font-bold text-green-600">{data.approved}</p>
        </div>
        <div className="p-3 rounded-lg bg-yellow-500/10">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{data.pending}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="text-xl font-bold text-red-600">{data.rejected}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Avg Moisture</p>
          <p className="text-xl font-bold">{data.avgMoisture.toFixed(1)}%</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Rejected Coffee Lots</p>
          <p className="text-xl font-bold">{data.totalRejectedCoffee}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default QualitySummarySection;
