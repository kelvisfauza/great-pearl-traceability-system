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
  | "milling-vs-sales"
  | "data-reconciliation";

interface ComparisonData {
  metric1Name: string;
  metric1Value: number;
  metric2Name: string;
  metric2Value: number;
  difference: number;
  percentageDiff: number;
  trend: "up" | "down" | "neutral";
  breakdown?: Array<{
    date: string;
    metric1: number;
    metric2: number;
    difference: number;
    issue?: string;
  }>;
}

const ComparisonReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comparisonType, setComparisonType] = useState<ComparisonType>("purchases-vs-sales");
  // Default to all available data (from August 2025) to match Store Reports page
  const [startDate, setStartDate] = useState<Date>(() => {
    return new Date('2025-08-01'); // Start from when data collection began
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dataSource, setDataSource] = useState<"transactions" | "store_reports">("store_reports");
  const [showAllBreakdown, setShowAllBreakdown] = useState(false);

  const comparisonOptions = [
    { value: "purchases-vs-sales", label: "Purchases vs Sales" },
    { value: "data-reconciliation", label: "🔍 Data Reconciliation (Find Issues)" },
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
        case "data-reconciliation":
          data = await fetchDataReconciliation();
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

  const fetchDataReconciliation = async (): Promise<ComparisonData> => {
    // Fetch coffee_records (actual transactions) by date
    const { data: coffeeRecords } = await supabase
      .from('coffee_records')
      .select('date, kilograms')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    // Fetch store_reports by date
    const { data: storeReports } = await supabase
      .from('store_reports')
      .select('date, kilograms_bought, kilograms_sold')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    // Fetch sales_transactions by date
    const { data: salesTransactions } = await supabase
      .from('sales_transactions')
      .select('date, weight')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    // Group coffee_records by date
    const coffeeByDate = new Map<string, number>();
    coffeeRecords?.forEach(r => {
      const date = r.date;
      coffeeByDate.set(date, (coffeeByDate.get(date) || 0) + (r.kilograms || 0));
    });

    // Group sales_transactions by date
    const salesByDate = new Map<string, number>();
    salesTransactions?.forEach(r => {
      const date = r.date;
      salesByDate.set(date, (salesByDate.get(date) || 0) + (r.weight || 0));
    });

    // Create store_reports map
    const storeByDate = new Map<string, { bought: number; sold: number }>();
    storeReports?.forEach(r => {
      storeByDate.set(r.date, {
        bought: r.kilograms_bought || 0,
        sold: r.kilograms_sold || 0
      });
    });

    // Get all unique dates
    const allDates = new Set([
      ...coffeeByDate.keys(),
      ...storeByDate.keys(),
      ...salesByDate.keys()
    ]);

    // Build breakdown
    const breakdown = Array.from(allDates).sort().map(date => {
      const coffeeKg = coffeeByDate.get(date) || 0;
      const storeData = storeByDate.get(date);
      const storeBoughtKg = storeData?.bought || 0;
      const storeSoldKg = storeData?.sold || 0;
      const salesKg = salesByDate.get(date) || 0;

      const purchaseDiff = coffeeKg - storeBoughtKg;
      const salesDiff = salesKg - storeSoldKg;

      let issue = "";
      if (Math.abs(purchaseDiff) > 1) {
        issue += `Purchase mismatch: ${Math.abs(purchaseDiff).toFixed(2)} kg. `;
      }
      if (Math.abs(salesDiff) > 1) {
        issue += `Sales mismatch: ${Math.abs(salesDiff).toFixed(2)} kg. `;
      }
      if (!storeData && (coffeeKg > 0 || salesKg > 0)) {
        issue = "⚠️ Missing store report";
      }
      if (storeData && coffeeKg === 0 && storeBoughtKg > 0) {
        issue = "⚠️ Store report exists but no transaction records";
      }

      return {
        date: format(new Date(date), "MMM dd, yyyy"),
        metric1: coffeeKg,
        metric2: storeBoughtKg,
        difference: purchaseDiff,
        issue: issue || "✓ Matches"
      };
    });

    const totalCoffeeRecords = Array.from(coffeeByDate.values()).reduce((sum, v) => sum + v, 0);
    const totalStoreReports = Array.from(storeByDate.values()).reduce((sum, v) => sum + v.bought, 0);
    const difference = totalCoffeeRecords - totalStoreReports;
    const percentageDiff = totalStoreReports > 0 ? (difference / totalStoreReports) * 100 : 0;

    return {
      metric1Name: "Assessed Coffee Records (kg)",
      metric1Value: totalCoffeeRecords,
      metric2Name: "Store Purchase Reports (kg)",
      metric2Value: totalStoreReports,
      difference,
      percentageDiff,
      trend: Math.abs(difference) > 100 ? "down" : "neutral",
      breakdown: breakdown.filter(b => b.issue !== "✓ Matches" || Math.abs(b.difference) > 1)
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

  const handlePrintBreakdown = () => {
    const filteredBreakdown = showAllBreakdown 
      ? comparisonData?.breakdown 
      : comparisonData?.breakdown?.filter(b => b.issue !== "✓ Matches");

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Data Reconciliation Breakdown - ${format(new Date(), "PPP")}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #000;
          }
          .company-logo { height: 64px; width: auto; margin-bottom: 8px; }
          .company-name { font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; color: #111; text-align: center; }
          .company-details { font-size: 14px; color: #666; margin-bottom: 16px; text-align: center; }
          .document-title { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #111; margin-bottom: 8px; text-align: center; }
          .period-info { font-size: 14px; color: #666; margin-bottom: 24px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f5f5f5; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #fafafa; }
          .text-right { text-align: right; }
          .issue-cell { font-weight: 500; }
          .error { color: #dc2626; font-weight: bold; }
          .warning { color: #f59e0b; }
          .success { color: #16a34a; }
          .summary { margin-top: 30px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print {
            body { margin: 0; }
            @page { margin: 20mm; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
          <img src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" alt="Company Logo" class="company-logo" />
          <h1 class="company-name">GREAT PEARL COFFEE FACTORY</h1>
          <div class="company-details">
            <p>Specialty Coffee Processing & Export</p>
            <p>+256781121639 / +256778536681</p>
            <p>www.greatpearlcoffee.com | greatpearlcoffee@gmail.com</p>
            <p>Uganda Coffee Development Authority Licensed</p>
          </div>
          <h2 class="document-title">Data Reconciliation - Detailed Issue Breakdown</h2>
          <div class="period-info">
            <p><strong>Period:</strong> ${format(startDate, "PPP")} - ${format(endDate, "PPP")}</p>
            <p><strong>Generated:</strong> ${format(new Date(), "PPP 'at' pp")}</p>
            <p><strong>Filter:</strong> ${showAllBreakdown ? "All Records" : "Issues Only"}</p>
          </div>
        </div>

        <div class="summary">
          <h3 style="margin-top: 0;">Summary</h3>
          <p><strong>Total Assessed Coffee:</strong> ${formatNumber(comparisonData?.metric1Value || 0)} kg</p>
          <p><strong>Total Store Reports:</strong> ${formatNumber(comparisonData?.metric2Value || 0)} kg</p>
          <p><strong>Total Difference:</strong> ${formatNumber(Math.abs(comparisonData?.difference || 0))} kg</p>
          <p><strong>Records Shown:</strong> ${filteredBreakdown?.length || 0} ${showAllBreakdown ? "total records" : "records with issues"}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="text-right">Assessed Coffee (kg)</th>
              <th class="text-right">Store Report (kg)</th>
              <th class="text-right">Difference (kg)</th>
              <th>Issue / Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBreakdown?.map(row => `
              <tr>
                <td><strong>${row.date}</strong></td>
                <td class="text-right">${formatNumber(row.metric1)}</td>
                <td class="text-right">${formatNumber(row.metric2)}</td>
                <td class="text-right ${Math.abs(row.difference) > 1 ? 'error' : ''}">${row.difference > 0 ? '+' : ''}${formatNumber(row.difference)}</td>
                <td class="issue-cell ${row.issue?.includes('⚠️') ? 'warning' : row.issue === '✓ Matches' ? 'success' : 'error'}">${row.issue}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No records found</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated report from Great Pearl Coffee Factory Management System</p>
          <p>For queries, contact: greatpearlcoffee@gmail.com | +256781121639</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
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

              {comparisonType === "purchases-vs-sales" && (
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
              )}

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
                  <>
                    <p className="text-muted-foreground">
                      <strong>Store Reports (Comprehensive):</strong> Uses daily store reports which aggregate all purchases and sales. 
                      This includes all transactions and provides the most complete picture of inventory movement.
                    </p>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">📅 Date Range Being Compared:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {format(startDate, "PPP")} to {format(endDate, "PPP")}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        ℹ️ To match with Store Reports page totals, make sure the date range matches. 
                        Store Reports page shows filtered data based on your selection there.
                      </p>
                    </div>
                  </>
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

        {/* Data Reconciliation Info */}
        {comparisonType === "data-reconciliation" && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="pt-6">
              <div className="text-sm space-y-3">
                <p className="font-semibold text-amber-900 dark:text-amber-100">🔍 Data Reconciliation Report</p>
                <p className="text-muted-foreground">
                  This report identifies discrepancies between your transaction records and store reports:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Assessed Coffee</strong> - Individual purchase transactions from coffee_records table</li>
                  <li><strong>Store Reports</strong> - Daily consolidated reports from store_reports table</li>
                </ul>
                <p className="text-muted-foreground">
                  The breakdown shows specific dates where numbers don't match, helping you identify:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Missing transaction records</li>
                  <li>Missing store reports</li>
                  <li>Data entry errors or discrepancies</li>
                  <li>Unreconciled amounts</li>
                </ul>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                  ⚠️ <strong>Action Required:</strong> Review each flagged date and reconcile the differences to ensure accurate inventory tracking.
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

            {comparisonData.breakdown && comparisonData.breakdown.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>🔍 Detailed Issue Breakdown</CardTitle>
                      <CardDescription>
                        Daily comparison showing discrepancies between assessed coffee and store reports
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllBreakdown(!showAllBreakdown)}
                      >
                        {showAllBreakdown ? "Show Issues Only" : "Show All Records"}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handlePrintBreakdown}
                        className="gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Print Breakdown
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium">
                      Showing: {showAllBreakdown ? "All records" : "Issues only"} 
                      ({(showAllBreakdown ? comparisonData.breakdown : comparisonData.breakdown.filter(b => b.issue !== "✓ Matches")).length} records)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-right p-2">Assessed Coffee (kg)</th>
                          <th className="text-right p-2">Store Report (kg)</th>
                          <th className="text-right p-2">Difference</th>
                          <th className="text-left p-2">Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllBreakdown ? comparisonData.breakdown : comparisonData.breakdown.filter(b => b.issue !== "✓ Matches")).map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{row.date}</td>
                            <td className="p-2 text-right">{formatNumber(row.metric1)}</td>
                            <td className="p-2 text-right">{formatNumber(row.metric2)}</td>
                            <td className={cn(
                              "p-2 text-right font-semibold",
                              Math.abs(row.difference) > 1 ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {row.difference > 0 ? '+' : ''}{formatNumber(row.difference)}
                            </td>
                            <td className={cn(
                              "p-2",
                              row.issue?.includes('⚠️') ? "text-amber-600 font-medium" : 
                              row.issue === "✓ Matches" ? "text-green-600" : "text-destructive font-medium"
                            )}>
                              {row.issue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
