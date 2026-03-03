import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { Building2, DollarSign, Package, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const BusinessOverviewSection = ({ data, periodLabel }: { data: WholeBusinessData; periodLabel?: string }) => {
  const totalRevenue = data.sales.totalRevenue + data.fieldOps.totalFieldPurchaseAmount;
  const totalExpenditure = data.finance.totalPaymentAmount + data.finance.totalExpenseAmount + data.finance.totalSalaryAmount;
  const overallScore = Math.round(data.departmentScores.reduce((s, d) => s + d.score, 0) / data.departmentScores.length);

  return (
    <div className="space-y-4">
      <div className="text-center print:mb-4">
        <h1 className="text-3xl font-bold text-foreground">Great Pearl Coffee</h1>
        <p className="text-muted-foreground">Comprehensive Business Report</p>
        <p className="text-sm text-muted-foreground">
          Period: <span className="font-semibold">{periodLabel || "All Time"}</span>
        </p>
        <p className="text-sm text-muted-foreground">Generated: {format(new Date(data.generatedAt), "PPpp")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">UGX {totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Expenditure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">UGX {totalExpenditure.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Total Stock (kg)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.inventory.availableBatchKg.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overallScore}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{data.hr.activeEmployees}</p>
            <p className="text-sm text-muted-foreground">Active Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{data.procurement.activeSuppliers}</p>
            <p className="text-sm text-muted-foreground">Active Suppliers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{data.inventory.totalCoffeeRecords}</p>
            <p className="text-sm text-muted-foreground">Coffee Lots Received</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessOverviewSection;
