import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";

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
  // Default to last 3 months for better data visibility
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dataSource, setDataSource] = useState<"transactions" | "store_reports">("store_reports");

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
  }, [comparisonType, startDate, endDate, dataSource]);

  useEffect(() => {
    if (comparisonData) {
      generateInsights();
    }
  }, [comparisonData]);

  const fetchComparisonData = async () => {
    setLoading(true);
    setInsights(""); // Clear previous insights
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

  const generateInsights = async () => {
    if (!comparisonData) return;
    
    setLoadingInsights(true);
    try {
      console.log("Generating insights for comparison...");
      const { data, error } = await supabase.functions.invoke('generate-comparison-insights', {
        body: {
          comparisonType: getComparisonLabel(),
          metric1Name: comparisonData.metric1Name,
          metric1Value: comparisonData.metric1Value,
          metric2Name: comparisonData.metric2Name,
          metric2Value: comparisonData.metric2Value,
          difference: comparisonData.difference,
          percentageDiff: comparisonData.percentageDiff,
          startDate: format(startDate, "PPP"),
          endDate: format(endDate, "PPP")
        }
      });

      if (error) {
        console.error("Error generating insights:", error);
        toast({
          title: "Error Generating Insights",
          description: error.message || "Could not generate detailed insights",
          variant: "destructive"
        });
        return;
      }

      if (data?.error) {
        console.error("AI Gateway error:", data.error);
        toast({
          title: "Notice",
          description: data.error,
          variant: "default"
        });
        return;
      }

      if (data?.insights) {
        console.log("Insights generated successfully");
        setInsights(data.insights);
      } else {
        console.error("No insights returned from function");
        toast({
          title: "Notice",
          description: "No insights were generated",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error generating insights:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchPurchasesVsSales = async (): Promise<ComparisonData> => {
    let totalPurchases = 0;
    let totalSales = 0;
    let purchaseSource = "";
    let salesSource = "";

    if (dataSource === "store_reports") {
      // Fetch from store_reports table (more comprehensive)
      const { data: reports } = await supabase
        .from('store_reports')
        .select('kilograms_bought, kilograms_sold')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      totalPurchases = reports?.reduce((sum, r) => sum + (r.kilograms_bought || 0), 0) || 0;
      totalSales = reports?.reduce((sum, r) => sum + (r.kilograms_sold || 0), 0) || 0;
      purchaseSource = " (Store Reports)";
      salesSource = " (Store Reports)";
    } else {
      // Fetch purchases from coffee_records
      const { data: purchases } = await supabase
        .from('coffee_records')
        .select('kilograms')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      totalPurchases = purchases?.reduce((sum, p) => sum + (p.kilograms || 0), 0) || 0;
      purchaseSource = " (Assessed Coffee)";

      // Fetch sales from sales_transactions
      const { data: sales } = await supabase
        .from('sales_transactions')
        .select('weight')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      totalSales = sales?.reduce((sum, s) => sum + (s.weight || 0), 0) || 0;
      salesSource = " (Sales Transactions)";
    }

    const difference = totalPurchases - totalSales;
    const percentageDiff = totalPurchases > 0 ? (difference / totalPurchases) * 100 : 0;

    return {
      metric1Name: `Total Purchases${purchaseSource} (kg)`,
      metric1Value: totalPurchases,
      metric2Name: `Total Sales${salesSource} (kg)`,
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

  const handlePrint = () => {
    window.print();
  };

  const getComparisonLabel = () => {
    const option = comparisonOptions.find(opt => opt.value === comparisonType);
    return option?.label || "Comparison Report";
  };

  return (
    <>
      {/* Print View */}
      <div className="print-only">
        <StandardPrintHeader
          title="Comparison Report"
          subtitle={getComparisonLabel()}
          additionalInfo={`Period: ${format(startDate, "PPP")} - ${format(endDate, "PPP")}`}
          includeDate
        />
        
        {comparisonData && (
          <div className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary mb-2">{comparisonData.metric1Name}</h3>
                <div className="text-4xl font-bold">{formatNumber(comparisonData.metric1Value)}</div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary mb-2">{comparisonData.metric2Name}</h3>
                <div className="text-4xl font-bold">{formatNumber(comparisonData.metric2Value)}</div>
              </div>
            </div>

            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-semibold mb-4">Analysis</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Difference</p>
                  <p className="text-2xl font-bold">{formatNumber(Math.abs(comparisonData.difference))}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Percentage</p>
                  <p className="text-2xl font-bold">{formatNumber(Math.abs(comparisonData.percentageDiff))}%</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-2">Insights</h4>
                <p className="text-sm">
                  {comparisonData.difference > 0 
                    ? `${comparisonData.metric1Name} exceeds ${comparisonData.metric2Name} by ${formatNumber(comparisonData.difference)}`
                    : comparisonData.difference < 0
                    ? `${comparisonData.metric2Name} exceeds ${comparisonData.metric1Name} by ${formatNumber(Math.abs(comparisonData.difference))}`
                    : `${comparisonData.metric1Name} and ${comparisonData.metric2Name} are balanced`
                  }
                </p>
              </div>
            </div>

            {insights && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-3">Business Analysis</h4>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {insights}
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
              <p>Generated on {format(new Date(), "PPP 'at' pp")}</p>
              <p className="mt-2">This is a computer-generated report. No signature is required.</p>
            </div>
          </div>
        )}
      </div>

      {/* Screen View */}
      <Layout 
        title="Comparison Reports" 
        subtitle="Compare different business metrics and identify trends"
      >
        <div className="space-y-6 no-print">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate("/reports")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          
          {comparisonData && (
            <Button 
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          )}
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Select comparison type and date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
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
                <label className="text-sm font-medium">Data Source</label>
                <Select value={dataSource} onValueChange={(value) => setDataSource(value as "transactions" | "store_reports")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_reports">Store Reports (Comprehensive)</SelectItem>
                    <SelectItem value="transactions">Individual Transactions</SelectItem>
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

        {/* Data Source Info */}
        {comparisonType === "purchases-vs-sales" && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-sm space-y-2">
                <p className="font-medium">📊 Data Source Information:</p>
                {dataSource === "store_reports" ? (
                  <p className="text-muted-foreground">
                    <strong>Store Reports (Comprehensive):</strong> Uses daily store reports which aggregate all purchases and sales. 
                    This includes all transactions and provides the most complete picture of inventory movement.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    <strong>Individual Transactions:</strong> Uses individual records from assessed coffee (coffee_records) and sales transactions (sales_transactions). 
                    This may show fewer numbers if not all transactions have been recorded in these tables.
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Tip: For the most accurate comparison, use "Store Reports (Comprehensive)" as it includes all documented transactions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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

            {loadingInsights && (
              <Card className="md:col-span-2">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Analyzing data and generating insights...</p>
                </CardContent>
              </Card>
            )}

            {insights && !loadingInsights && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Business Analysis & Breakdown</CardTitle>
                  <CardDescription>Detailed insights and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {insights}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
        </div>
      </Layout>
    </>
  );
};

export default ComparisonReport;
