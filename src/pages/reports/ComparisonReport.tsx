import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ComparisonType = 
  | "purchases-vs-sales"
  | "quality-vs-purchases"
  | "eudr-vs-purchases"
  | "expenses-vs-revenue"
  | "field-operations-vs-purchases"
  | "milling-vs-sales";

interface ComparisonData {
  metric1Name: string;
  metric1Value: number;
  metric2Name: string;
  metric2Value: number;
  difference: number;
  percentageDiff: number;
  trend: "up" | "down" | "neutral";
}

const ComparisonReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comparisonType, setComparisonType] = useState<ComparisonType>("purchases-vs-sales");
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);

  const comparisonOptions = [
    { value: "purchases-vs-sales", label: "Purchases vs Sales" },
    { value: "quality-vs-purchases", label: "Quality Assessments vs Purchases" },
    { value: "eudr-vs-purchases", label: "EUDR Documentation vs Purchases" },
    { value: "expenses-vs-revenue", label: "Expenses vs Revenue" },
    { value: "field-operations-vs-purchases", label: "Field Operations vs Purchases" },
    { value: "milling-vs-sales", label: "Milling Output vs Sales" },
  ];

  useEffect(() => {
    if (startDate && endDate) {
      fetchComparisonData();
    }
  }, [comparisonType, startDate, endDate]);

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      let data: ComparisonData | null = null;

      switch (comparisonType) {
        case "purchases-vs-sales":
          data = await fetchPurchasesVsSales();
          break;
        case "quality-vs-purchases":
          data = await fetchQualityVsPurchases();
          break;
        case "eudr-vs-purchases":
          data = await fetchEUDRVsPurchases();
          break;
        case "expenses-vs-revenue":
          data = await fetchExpensesVsRevenue();
          break;
        case "field-operations-vs-purchases":
          data = await fetchFieldOpsVsPurchases();
          break;
        case "milling-vs-sales":
          data = await fetchMillingVsSales();
          break;
      }

      setComparisonData(data);
    } catch (error) {
      console.error("Error fetching comparison data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch comparison data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasesVsSales = async (): Promise<ComparisonData> => {
    // Fetch purchases from coffee_records
    const { data: purchases } = await supabase
      .from('coffee_records')
      .select('kilograms')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const totalPurchases = purchases?.reduce((sum, p) => sum + (p.kilograms || 0), 0) || 0;

    // Fetch sales from sales_transactions
    const { data: sales } = await supabase
      .from('sales_transactions')
      .select('weight')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const totalSales = sales?.reduce((sum, s) => sum + (s.weight || 0), 0) || 0;

    const difference = totalPurchases - totalSales;
    const percentageDiff = totalPurchases > 0 ? (difference / totalPurchases) * 100 : 0;

    return {
      metric1Name: "Total Purchases (kg)",
      metric1Value: totalPurchases,
      metric2Name: "Total Sales (kg)",
      metric2Value: totalSales,
      difference,
      percentageDiff,
      trend: difference > 0 ? "up" : difference < 0 ? "down" : "neutral"
    };
  };

  const fetchQualityVsPurchases = async (): Promise<ComparisonData> => {
    // Fetch quality assessments
    const { data: quality } = await supabase
      .from('quality_assessments')
      .select('id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const qualityCount = quality?.length || 0;

    // Fetch purchases
    const { data: purchases } = await supabase
      .from('coffee_records')
      .select('id')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const purchaseCount = purchases?.length || 0;
    const difference = qualityCount - purchaseCount;
    const percentageDiff = purchaseCount > 0 ? (qualityCount / purchaseCount) * 100 : 0;

    return {
      metric1Name: "Quality Assessments",
      metric1Value: qualityCount,
      metric2Name: "Purchase Transactions",
      metric2Value: purchaseCount,
      difference,
      percentageDiff,
      trend: percentageDiff >= 95 ? "up" : "down"
    };
  };

  const fetchEUDRVsPurchases = async (): Promise<ComparisonData> => {
    // Fetch EUDR documentation
    const { data: eudr } = await supabase
      .from('eudr_documents')
      .select('id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const eudrCount = eudr?.length || 0;

    // Fetch purchases
    const { data: purchases } = await supabase
      .from('coffee_records')
      .select('id')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const purchaseCount = purchases?.length || 0;
    const percentageDiff = purchaseCount > 0 ? (eudrCount / purchaseCount) * 100 : 0;

    return {
      metric1Name: "EUDR Documents",
      metric1Value: eudrCount,
      metric2Name: "Purchase Transactions",
      metric2Value: purchaseCount,
      difference: eudrCount - purchaseCount,
      percentageDiff,
      trend: percentageDiff >= 95 ? "up" : "down"
    };
  };

  const fetchExpensesVsRevenue = async (): Promise<ComparisonData> => {
    // Fetch expenses
    const { data: expenses } = await supabase
      .from('finance_expenses')
      .select('amount')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // Fetch revenue from sales
    const { data: sales } = await supabase
      .from('sales_transactions')
      .select('total_amount')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const totalRevenue = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
    const difference = totalRevenue - totalExpenses;
    const percentageDiff = totalRevenue > 0 ? (difference / totalRevenue) * 100 : 0;

    return {
      metric1Name: "Total Revenue (UGX)",
      metric1Value: totalRevenue,
      metric2Name: "Total Expenses (UGX)",
      metric2Value: totalExpenses,
      difference,
      percentageDiff,
      trend: difference > 0 ? "up" : "down"
    };
  };

  const fetchFieldOpsVsPurchases = async (): Promise<ComparisonData> => {
    // Fetch field collections
    const { data: fieldOps } = await supabase
      .from('field_collections')
      .select('id')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const fieldOpsCount = fieldOps?.length || 0;

    // Fetch purchases
    const { data: purchases } = await supabase
      .from('coffee_records')
      .select('id')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const purchaseCount = purchases?.length || 0;
    const percentageDiff = purchaseCount > 0 ? (fieldOpsCount / purchaseCount) * 100 : 0;

    return {
      metric1Name: "Field Collections",
      metric1Value: fieldOpsCount,
      metric2Name: "Purchase Transactions",
      metric2Value: purchaseCount,
      difference: fieldOpsCount - purchaseCount,
      percentageDiff,
      trend: "neutral"
    };
  };

  const fetchMillingVsSales = async (): Promise<ComparisonData> => {
    // Fetch milling output
    const { data: milling } = await supabase
      .from('milling_transactions')
      .select('kgs_hulled')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const totalMilling = milling?.reduce((sum, m) => sum + (m.kgs_hulled || 0), 0) || 0;

    // Fetch sales
    const { data: sales } = await supabase
      .from('sales_transactions')
      .select('weight')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const totalSales = sales?.reduce((sum, s) => sum + (s.weight || 0), 0) || 0;
    const difference = totalMilling - totalSales;
    const percentageDiff = totalMilling > 0 ? (difference / totalMilling) * 100 : 0;

    return {
      metric1Name: "Milling Output (kg)",
      metric1Value: totalMilling,
      metric2Name: "Sales Output (kg)",
      metric2Value: totalSales,
      difference,
      percentageDiff,
      trend: difference >= 0 ? "up" : "down"
    };
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "down":
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Layout 
      title="Comparison Reports" 
      subtitle="Compare different business metrics and identify trends"
    >
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/reports")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Select comparison type and date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Comparison Type</label>
                <Select value={comparisonType} onValueChange={(value) => setComparisonType(value as ComparisonType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {comparisonOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading comparison data...</p>
            </CardContent>
          </Card>
        ) : comparisonData ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">{comparisonData.metric1Name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{formatNumber(comparisonData.metric1Value)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-primary">{comparisonData.metric2Name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{formatNumber(comparisonData.metric2Value)}</div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Comparison Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Difference</p>
                    <p className="text-2xl font-bold">{formatNumber(Math.abs(comparisonData.difference))}</p>
                  </div>
                  {getTrendIcon(comparisonData.trend)}
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="text-2xl font-bold">{formatNumber(Math.abs(comparisonData.percentageDiff))}%</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    {comparisonData.difference > 0 
                      ? `${comparisonData.metric1Name} exceeds ${comparisonData.metric2Name} by ${formatNumber(comparisonData.difference)}`
                      : comparisonData.difference < 0
                      ? `${comparisonData.metric2Name} exceeds ${comparisonData.metric1Name} by ${formatNumber(Math.abs(comparisonData.difference))}`
                      : `${comparisonData.metric1Name} and ${comparisonData.metric2Name} are balanced`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ComparisonReport;
