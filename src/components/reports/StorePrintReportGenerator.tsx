import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, Printer, Download, Store, Calculator } from 'lucide-react';
import { useStoreReports } from '@/hooks/useStoreReports';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';

interface StoreReportData {
  dateRange: {
    from: string;
    to: string;
  };
  summary: {
    totalKgBought: number;
    totalKgSold: number;
    totalKgLeft: number;
    totalKgUnbought: number;
    totalAdvancesGiven: number;
    totalBagsLeft: number;
    totalBagsSold: number;
    averageBuyingPrice: number;
    netInventoryChange: number;
  };
  dailyBreakdown: {
    [key: string]: {
      kgBought: number;
      kgSold: number;
      advancesGiven: number;
      transactions: number;
    };
  };
  coffeeTypeAnalysis: {
    [key: string]: {
      totalBought: number;
      totalSold: number;
      avgPrice: number;
      leftInStore: number;
    };
  };
  transactions: any[];
}

const StorePrintReportGenerator = () => {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState('weekly');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<StoreReportData | null>(null);

  const { reports, loading } = useStoreReports();

  const setQuickDateRange = (type: string) => {
    const today = new Date();
    switch (type) {
      case 'today':
        setDateFrom(format(today, 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'week':
        setDateFrom(format(startOfWeek(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfWeek(today), 'yyyy-MM-dd'));
        break;
      case 'month':
        setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'last7days':
        setDateFrom(format(subDays(today, 7), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  const generateStoreReportData = async () => {
    setGenerating(true);
    try {
      const fromDate = parseISO(dateFrom);
      const toDate = parseISO(dateTo);

      // Filter reports by date range
      const filteredReports = reports.filter(r => {
        const reportDate = parseISO(r.date);
        return reportDate >= fromDate && reportDate <= toDate;
      });

      // Calculate summary statistics
      const totalKgBought = filteredReports.reduce((sum, r) => sum + r.kilograms_bought, 0);
      const totalKgSold = filteredReports.reduce((sum, r) => sum + r.kilograms_sold, 0);
      const totalKgLeft = filteredReports.reduce((sum, r) => sum + r.kilograms_left, 0);
      const totalKgUnbought = filteredReports.reduce((sum, r) => sum + r.kilograms_unbought, 0);
      const totalAdvancesGiven = filteredReports.reduce((sum, r) => sum + r.advances_given, 0);
      const totalBagsLeft = filteredReports.reduce((sum, r) => sum + r.bags_left, 0);
      const totalBagsSold = filteredReports.reduce((sum, r) => sum + r.bags_sold, 0);
      
      const averageBuyingPrice = filteredReports.length > 0 
        ? filteredReports.reduce((sum, r) => sum + r.average_buying_price, 0) / filteredReports.length
        : 0;

      const netInventoryChange = totalKgBought - totalKgSold;

      // Daily breakdown
      const dailyBreakdown: { [key: string]: { kgBought: number; kgSold: number; advancesGiven: number; transactions: number } } = {};
      
      filteredReports.forEach(r => {
        const date = r.date;
        if (!dailyBreakdown[date]) {
          dailyBreakdown[date] = { kgBought: 0, kgSold: 0, advancesGiven: 0, transactions: 0 };
        }
        dailyBreakdown[date].kgBought += r.kilograms_bought;
        dailyBreakdown[date].kgSold += r.kilograms_sold;
        dailyBreakdown[date].advancesGiven += r.advances_given;
        dailyBreakdown[date].transactions += 1;
      });

      // Coffee type analysis
      const coffeeTypeAnalysis: { [key: string]: { totalBought: number; totalSold: number; avgPrice: number; leftInStore: number } } = {};
      
      filteredReports.forEach(r => {
        const type = r.coffee_type;
        if (!coffeeTypeAnalysis[type]) {
          coffeeTypeAnalysis[type] = { totalBought: 0, totalSold: 0, avgPrice: 0, leftInStore: 0 };
        }
        coffeeTypeAnalysis[type].totalBought += r.kilograms_bought;
        coffeeTypeAnalysis[type].totalSold += r.kilograms_sold;
        coffeeTypeAnalysis[type].leftInStore += r.kilograms_left;
      });

      // Calculate average prices for each coffee type
      Object.keys(coffeeTypeAnalysis).forEach(type => {
        const typeReports = filteredReports.filter(r => r.coffee_type === type);
        coffeeTypeAnalysis[type].avgPrice = typeReports.length > 0
          ? typeReports.reduce((sum, r) => sum + r.average_buying_price, 0) / typeReports.length
          : 0;
      });

      const reportData: StoreReportData = {
        dateRange: { from: dateFrom, to: dateTo },
        summary: {
          totalKgBought,
          totalKgSold,
          totalKgLeft,
          totalKgUnbought,
          totalAdvancesGiven,
          totalBagsLeft,
          totalBagsSold,
          averageBuyingPrice,
          netInventoryChange
        },
        dailyBreakdown,
        coffeeTypeAnalysis,
        transactions: filteredReports
      };

      setReportData(reportData);
    } catch (error) {
      console.error('Error generating store report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportContent = `
STORE COMPREHENSIVE REPORT
${format(parseISO(reportData.dateRange.from), 'MMM dd, yyyy')} - ${format(parseISO(reportData.dateRange.to), 'MMM dd, yyyy')}

SUMMARY STATISTICS
==================
Total Kgs Bought: ${reportData.summary.totalKgBought.toLocaleString()} kg
Total Kgs Sold: ${reportData.summary.totalKgSold.toLocaleString()} kg
Total Kgs Left in Store: ${reportData.summary.totalKgLeft.toLocaleString()} kg
Total Kgs Unbought: ${reportData.summary.totalKgUnbought.toLocaleString()} kg
Total Bags Left: ${reportData.summary.totalBagsLeft.toLocaleString()}
Total Bags Sold: ${reportData.summary.totalBagsSold.toLocaleString()}
Average Buying Price: UGX ${reportData.summary.averageBuyingPrice.toLocaleString()}/kg
Total Advances Given: UGX ${reportData.summary.totalAdvancesGiven.toLocaleString()}
Net Inventory Change: ${reportData.summary.netInventoryChange.toLocaleString()} kg

COFFEE TYPE ANALYSIS
====================
${Object.entries(reportData.coffeeTypeAnalysis)
  .map(([type, data]) => 
    `${type}:
    - Bought: ${data.totalBought.toLocaleString()} kg
    - Sold: ${data.totalSold.toLocaleString()} kg
    - Left in Store: ${data.leftInStore.toLocaleString()} kg
    - Average Price: UGX ${data.avgPrice.toLocaleString()}/kg`
  ).join('\n\n')}

DAILY BREAKDOWN
===============
${Object.entries(reportData.dailyBreakdown)
  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  .map(([date, data]) => 
    `${format(parseISO(date), 'MMM dd, yyyy')}: Bought: ${data.kgBought.toLocaleString()} kg, Sold: ${data.kgSold.toLocaleString()} kg, Advances: UGX ${data.advancesGiven.toLocaleString()}, Transactions: ${data.transactions}`
  ).join('\n')}

DETAILED TRANSACTIONS
=====================
${reportData.transactions
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .map(t => 
    `${format(parseISO(t.date), 'MMM dd, yyyy')} - ${t.coffee_type}:
    Bought: ${t.kilograms_bought} kg @ UGX ${t.average_buying_price}/kg
    Sold: ${t.kilograms_sold} kg to ${t.sold_to || 'N/A'}
    Advances: UGX ${t.advances_given.toLocaleString()}
    Input by: ${t.input_by}
    ${t.comments ? `Comments: ${t.comments}` : ''}`
  ).join('\n\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Report Generator Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Print Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <Select value={reportType} onValueChange={(value) => {
                setReportType(value);
                setQuickDateRange(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={generateStoreReportData} 
                disabled={generating || loading}
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {reportData && (
        <div className="print:shadow-none space-y-6">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="text-center print:pb-4">
              <CardTitle className="text-2xl">Store Operations Report</CardTitle>
              <p className="text-muted-foreground">
                {format(parseISO(reportData.dateRange.from), 'MMMM dd, yyyy')} - {format(parseISO(reportData.dateRange.to), 'MMMM dd, yyyy')}
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Summary Statistics */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Summary Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Kgs Bought</p>
                    <p className="text-lg font-semibold text-green-600">{reportData.summary.totalKgBought.toLocaleString()} kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Kgs Sold</p>
                    <p className="text-lg font-semibold text-blue-600">{reportData.summary.totalKgSold.toLocaleString()} kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Kgs Left</p>
                    <p className="text-lg font-semibold text-orange-600">{reportData.summary.totalKgLeft.toLocaleString()} kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Kgs Unbought</p>
                    <p className="text-lg font-semibold text-red-600">{reportData.summary.totalKgUnbought.toLocaleString()} kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Bags Left</p>
                    <p className="text-lg font-semibold">{reportData.summary.totalBagsLeft.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Bags Sold</p>
                    <p className="text-lg font-semibold">{reportData.summary.totalBagsSold.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Buying Price</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.summary.averageBuyingPrice)}/kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Advances</p>
                    <p className="text-lg font-semibold text-purple-600">{formatCurrency(reportData.summary.totalAdvancesGiven)}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Net Inventory Change</p>
                    <p className={`text-lg font-semibold ${reportData.summary.netInventoryChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.summary.netInventoryChange >= 0 ? '+' : ''}{reportData.summary.netInventoryChange.toLocaleString()} kg
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Coffee Type Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Coffee Type Analysis</h3>
                <div className="grid gap-4">
                  {Object.entries(reportData.coffeeTypeAnalysis).map(([type, data]) => (
                    <div key={type} className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">{type}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Bought</p>
                          <p className="font-semibold text-green-600">{data.totalBought.toLocaleString()} kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Sold</p>
                          <p className="font-semibold text-blue-600">{data.totalSold.toLocaleString()} kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Left in Store</p>
                          <p className="font-semibold text-orange-600">{data.leftInStore.toLocaleString()} kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Avg Price</p>
                          <p className="font-semibold">{formatCurrency(data.avgPrice)}/kg</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Daily Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Daily Breakdown</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-4 py-2 font-semibold border-b">
                    <div>Date</div>
                    <div>Kgs Bought</div>
                    <div>Kgs Sold</div>
                    <div>Advances Given</div>
                    <div>Transactions</div>
                  </div>
                  {Object.entries(reportData.dailyBreakdown)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, data]) => (
                      <div key={date} className="grid grid-cols-5 gap-4 py-2 border-b">
                        <div className="font-medium">{format(parseISO(date), 'MMM dd, yyyy')}</div>
                        <div className="text-green-600">{data.kgBought.toLocaleString()} kg</div>
                        <div className="text-blue-600">{data.kgSold.toLocaleString()} kg</div>
                        <div className="text-purple-600">{formatCurrency(data.advancesGiven)}</div>
                        <div>{data.transactions}</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 print:hidden">
                <Button onClick={printReport} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
                <Button onClick={exportReport} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export as Text
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StorePrintReportGenerator;