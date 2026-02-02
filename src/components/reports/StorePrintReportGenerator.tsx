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
import { createPrintVerification, getVerificationHtml, getVerificationStyles } from '@/utils/printVerification';

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
      const totalBagsSold = filteredReports.reduce((sum, r) => sum + r.bags_sold, 0);
      const totalAdvancesGiven = filteredReports.reduce((sum, r) => sum + r.advances_given, 0);
      
      // Get the latest inventory levels (most recent report in the period)
      const sortedReports = [...filteredReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestReport = sortedReports[0];
      const totalKgLeft = latestReport ? latestReport.kilograms_left : 0;
      const totalKgUnbought = latestReport ? latestReport.kilograms_unbought : 0;
      const totalBagsLeft = latestReport ? latestReport.bags_left : 0;
      
      // Calculate weighted average buying price based on quantity bought
      const totalWeightedPrice = filteredReports.reduce((sum, r) => sum + (r.kilograms_bought * r.average_buying_price), 0);
      const averageBuyingPrice = totalKgBought > 0 
        ? totalWeightedPrice / totalKgBought
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
      });

      // For leftInStore, get the latest value for each coffee type
      Object.keys(coffeeTypeAnalysis).forEach(type => {
        const typeReports = filteredReports.filter(r => r.coffee_type === type).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        coffeeTypeAnalysis[type].leftInStore = typeReports.length > 0 ? typeReports[0].kilograms_left : 0;
      });

      // Calculate weighted average prices for each coffee type
      Object.keys(coffeeTypeAnalysis).forEach(type => {
        const typeReports = filteredReports.filter(r => r.coffee_type === type);
        const totalTypeWeightedPrice = typeReports.reduce((sum, r) => sum + (r.kilograms_bought * r.average_buying_price), 0);
        const totalTypeBought = typeReports.reduce((sum, r) => sum + r.kilograms_bought, 0);
        coffeeTypeAnalysis[type].avgPrice = totalTypeBought > 0
          ? totalTypeWeightedPrice / totalTypeBought
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

  const printReport = async () => {
    // Create verification record
    const { code, qrUrl } = await createPrintVerification({
      type: 'report',
      subtype: 'Store Operations Report',
      reference_no: `STORE-${dateFrom}-${dateTo}`,
      meta: { dateFrom, dateTo, reportType }
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Store Operations Report - ${dateFrom} to ${dateTo}</title>
            <style>
              @page {
                margin: 0.5in;
                size: A4;
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px;
                line-height: 1.4;
                color: #333;
              }
              .company-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
                color: #1a365d;
              }
              .company-details {
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
              }
              .report-title {
                font-size: 20px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
                background: #f8f9fa;
                padding: 15px;
                border: 1px solid #ddd;
              }
              .section {
                margin: 30px 0;
                break-inside: avoid;
              }
              .section-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
                padding: 10px;
                background: #e9ecef;
                border-left: 4px solid #007bff;
              }
              .summary-table, .breakdown-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
              }
              .summary-table th, .summary-table td,
              .breakdown-table th, .breakdown-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              .summary-table th, .breakdown-table th {
                background-color: #f8f9fa;
                font-weight: bold;
              }
              .amount {
                text-align: right;
                font-weight: 500;
              }
              .positive { color: #28a745; }
              .negative { color: #dc3545; }
              .neutral { color: #6c757d; }
              .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
              }
              .card {
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 5px;
                background: #f8f9fa;
              }
              .metric {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
                border-bottom: 1px dotted #ccc;
              }
              .total-row {
                background-color: #f1f3f4;
                font-weight: bold;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 15px;
              }
              .page-break {
                page-break-before: always;
              }
            </style>
          </head>
          <body>
            <div class="company-header">
              <div style="text-align: center; margin-bottom: 15px;">
                <img src="${window.location.origin}/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
                     alt="Great Pearl Coffee Factory Logo" 
                     style="height: 60px; width: auto; margin-bottom: 10px;" />
              </div>
              <div class="company-name">GREAT PEARL COFFEE FACTORY</div>
              <div class="company-details">
                Specialty Coffee Processing & Export<br>
                Tel: +256 781 121 639 | Web: www.greatpearlcoffee.com<br>
                Email: info@greatpearlcoffee.com<br>
                Uganda Coffee Development Authority Licensed
              </div>
            </div>

            <div class="report-title">
              STORE OPERATIONS REPORT<br>
              <small>Period: ${format(parseISO(reportData.dateRange.from), 'MMMM dd, yyyy')} - ${format(parseISO(reportData.dateRange.to), 'MMMM dd, yyyy')}</small>
            </div>

            <!-- Store Balance Sheet -->
            <div class="section">
              <div class="section-title">STORE BALANCE SHEET</div>
              <table class="summary-table">
                <thead>
                  <tr>
                    <th colspan="2">INVENTORY ASSETS</th>
                    <th>QUANTITY</th>
                    <th>VALUE (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="2">Coffee Inventory</td>
                    <td class="amount">${reportData.summary.totalKgLeft.toLocaleString()} kg</td>
                    <td class="amount">${(reportData.summary.totalKgLeft * reportData.summary.averageBuyingPrice).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 20px;">Coffee (Bought)</td>
                    <td></td>
                    <td class="amount">${(reportData.summary.totalKgLeft - reportData.summary.totalKgUnbought).toLocaleString()} kg</td>
                    <td class="amount">${((reportData.summary.totalKgLeft - reportData.summary.totalKgUnbought) * reportData.summary.averageBuyingPrice).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 20px;">Coffee (Unbought)</td>
                    <td></td>
                    <td class="amount">${reportData.summary.totalKgUnbought.toLocaleString()} kg</td>
                    <td class="amount">0</td>
                  </tr>
                  <tr>
                    <td colspan="2">Bag Inventory</td>
                    <td class="amount">${reportData.summary.totalBagsLeft.toLocaleString()} bags</td>
                    <td class="amount">-</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2"><strong>Total Inventory Value</strong></td>
                    <td class="amount"><strong>${reportData.summary.totalKgLeft.toLocaleString()} kg</strong></td>
                    <td class="amount"><strong>${(reportData.summary.totalKgLeft * reportData.summary.averageBuyingPrice).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>

              <table class="summary-table" style="margin-top: 20px;">
                <thead>
                  <tr>
                    <th colspan="2">LIABILITIES & ADVANCES</th>
                    <th>AMOUNT (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="2">Advances Given to Suppliers</td>
                    <td class="amount">${reportData.summary.totalAdvancesGiven.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colspan="2">Estimated Coffee Purchase Value</td>
                    <td class="amount">${(reportData.summary.totalKgBought * reportData.summary.averageBuyingPrice).toLocaleString()}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2"><strong>Total Outgoing Value</strong></td>
                    <td class="amount"><strong>${(reportData.summary.totalAdvancesGiven + (reportData.summary.totalKgBought * reportData.summary.averageBuyingPrice)).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Store Trial Balance -->
            <div class="section">
              <div class="section-title">STORE TRIAL BALANCE</div>
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Debit (UGX)</th>
                    <th>Credit (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Coffee Inventory</td>
                    <td class="amount">${(reportData.summary.totalKgLeft * reportData.summary.averageBuyingPrice).toLocaleString()}</td>
                    <td class="amount">-</td>
                  </tr>
                  <tr>
                    <td>Coffee Purchases</td>
                    <td class="amount">${(reportData.summary.totalKgBought * reportData.summary.averageBuyingPrice).toLocaleString()}</td>
                    <td class="amount">-</td>
                  </tr>
                  <tr>
                    <td>Advances to Suppliers</td>
                    <td class="amount">${reportData.summary.totalAdvancesGiven.toLocaleString()}</td>
                    <td class="amount">-</td>
                  </tr>
                  <tr>
                    <td>Sales Revenue (Estimated)</td>
                    <td class="amount">-</td>
                    <td class="amount">${(reportData.summary.totalKgSold * reportData.summary.averageBuyingPrice * 1.2).toLocaleString()}</td>
                  </tr>
                  <tr class="total-row">
                    <td><strong>TOTALS</strong></td>
                    <td class="amount"><strong>${(reportData.summary.totalKgLeft * reportData.summary.averageBuyingPrice + reportData.summary.totalKgBought * reportData.summary.averageBuyingPrice + reportData.summary.totalAdvancesGiven).toLocaleString()}</strong></td>
                    <td class="amount"><strong>${(reportData.summary.totalKgSold * reportData.summary.averageBuyingPrice * 1.2).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Summary Statistics -->
            <div class="section page-break">
              <div class="section-title">OPERATIONAL SUMMARY</div>
              <div class="grid">
                <div class="card">
                  <h4>Purchase Analysis</h4>
                  <div class="metric">
                    <span>Total Kgs Bought:</span>
                    <span class="positive">${reportData.summary.totalKgBought.toLocaleString()} kg</span>
                  </div>
                  <div class="metric">
                    <span>Average Buying Price:</span>
                    <span>${reportData.summary.averageBuyingPrice.toLocaleString()}/kg</span>
                  </div>
                  <div class="metric">
                    <span>Total Purchase Value:</span>
                    <span class="negative">${(reportData.summary.totalKgBought * reportData.summary.averageBuyingPrice).toLocaleString()}</span>
                  </div>
                  <div class="metric">
                    <span>Total Advances:</span>
                    <span class="negative">${reportData.summary.totalAdvancesGiven.toLocaleString()}</span>
                  </div>
                </div>
                <div class="card">
                  <h4>Sales & Inventory</h4>
                  <div class="metric">
                    <span>Total Kgs Sold:</span>
                    <span class="positive">${reportData.summary.totalKgSold.toLocaleString()} kg</span>
                  </div>
                  <div class="metric">
                    <span>Total Bags Sold:</span>
                    <span>${reportData.summary.totalBagsSold.toLocaleString()}</span>
                  </div>
                  <div class="metric">
                    <span>Kgs Left in Store:</span>
                    <span class="neutral">${reportData.summary.totalKgLeft.toLocaleString()} kg</span>
                  </div>
                  <div class="metric">
                    <span>Kgs Unbought:</span>
                    <span class="neutral">${reportData.summary.totalKgUnbought.toLocaleString()} kg</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Coffee Type Analysis -->
            <div class="section">
              <div class="section-title">COFFEE TYPE BREAKDOWN</div>
              <table class="breakdown-table">
                <thead>
                  <tr>
                    <th>Coffee Type</th>
                    <th>Bought (kg)</th>
                    <th>Sold (kg)</th>
                    <th>Left (kg)</th>
                    <th>Avg Price (UGX/kg)</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(reportData.coffeeTypeAnalysis).map(([type, data]) => `
                    <tr>
                      <td><strong>${type}</strong></td>
                      <td class="amount positive">${data.totalBought.toLocaleString()}</td>
                      <td class="amount neutral">${data.totalSold.toLocaleString()}</td>
                      <td class="amount neutral">${data.leftInStore.toLocaleString()}</td>
                      <td class="amount">${data.avgPrice.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Daily Breakdown -->
            <div class="section page-break">
              <div class="section-title">DAILY OPERATIONS BREAKDOWN</div>
              <table class="breakdown-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Kgs Bought</th>
                    <th>Kgs Sold</th>
                    <th>Advances Given (UGX)</th>
                    <th>Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(reportData.dailyBreakdown)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, data]) => `
                      <tr>
                        <td>${format(parseISO(date), 'MMM dd, yyyy')}</td>
                        <td class="amount positive">${data.kgBought.toLocaleString()}</td>
                        <td class="amount neutral">${data.kgSold.toLocaleString()}</td>
                        <td class="amount negative">${data.advancesGiven.toLocaleString()}</td>
                        <td class="amount">${data.transactions}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>

            ${getVerificationHtml(code, qrUrl)}

            <div class="footer">
              <p>Store Report generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
              <p>This report is confidential and proprietary to Great Pearl Coffee Factory</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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