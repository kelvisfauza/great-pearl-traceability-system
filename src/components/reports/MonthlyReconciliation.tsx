import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMonthlyReconciliation } from "@/hooks/useMonthlyReconciliation";
import { Download, Printer, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";

const MonthlyReconciliation = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { data, loading } = useMonthlyReconciliation(selectedMonth, selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text("Monthly Financial Reconciliation", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    doc.setFontSize(14);
    doc.text(`${data.month} ${data.year}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Helper function to add sections
    const addSection = (title: string, items: Array<{ label: string; value: string }>) => {
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(title, 20, yPos);
      yPos += 7;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);

      items.forEach(item => {
        doc.text(item.label, 25, yPos);
        doc.text(item.value, pageWidth - 25, yPos, { align: "right" });
        yPos += 6;
      });
      yPos += 5;

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    };

    // Purchases
    addSection("Purchases", [
      { label: "Total Purchases", value: formatCurrency(data.totalPurchases) },
      { label: "Total Kilograms Purchased", value: `${data.totalPurchaseKg.toFixed(2)} kg` }
    ]);

    // Sales
    addSection("Sales", [
      { label: "Total Sales Revenue", value: formatCurrency(data.totalSales) },
      { label: "Total Kilograms Sold", value: `${data.totalSalesKg.toFixed(2)} kg` }
    ]);

    // Inventory
    addSection("Inventory", [
      { label: "Opening Inventory Value", value: formatCurrency(data.openingInventoryValue) },
      { label: "Closing Inventory Value", value: formatCurrency(data.closingInventoryValue) },
      { label: "Closing Inventory Weight", value: `${data.closingInventoryKg.toFixed(2)} kg` }
    ]);

    // Payments
    addSection("Payments & Advances", [
      { label: "Payments to Suppliers", value: formatCurrency(data.totalPaymentsToSuppliers) },
      { label: "Advances Given", value: formatCurrency(data.totalAdvancesGiven) },
      { label: "Operating Expenses", value: formatCurrency(data.totalExpenses) }
    ]);

    // Cash Flow
    addSection("Cash Flow", [
      { label: "Cash In", value: formatCurrency(data.totalCashIn) },
      { label: "Cash Out", value: formatCurrency(data.totalCashOut) },
      { label: "Net Cash Flow", value: formatCurrency(data.netCashFlow) }
    ]);

    // P&L
    addSection("Profit & Loss Statement", [
      { label: "Revenue", value: formatCurrency(data.revenue) },
      { label: "Cost of Goods Sold", value: formatCurrency(data.costOfGoodsSold) },
      { label: "Gross Profit", value: formatCurrency(data.grossProfit) },
      { label: "Operating Expenses", value: formatCurrency(data.operatingExpenses) },
      { label: "Net Profit", value: formatCurrency(data.netProfit) }
    ]);

    // Balance Sheet
    addSection("Balance Sheet", [
      { label: "Total Assets", value: formatCurrency(data.totalAssets) },
      { label: "Total Liabilities", value: formatCurrency(data.totalLiabilities) },
      { label: "Equity", value: formatCurrency(data.equity) }
    ]);

    doc.save(`Monthly_Reconciliation_${data.month}_${data.year}.pdf`);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No data available for the selected period
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex gap-4">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="print-content">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Monthly Financial Reconciliation</CardTitle>
            <p className="text-muted-foreground">{data.month} {data.year}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Purchases */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Purchases</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchases</p>
                  <p className="text-xl font-semibold">{formatCurrency(data.totalPurchases)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kilograms Purchased</p>
                  <p className="text-xl font-semibold">{data.totalPurchaseKg.toFixed(2)} kg</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sales */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Sales</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales Revenue</p>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(data.totalSales)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kilograms Sold</p>
                  <p className="text-xl font-semibold">{data.totalSalesKg.toFixed(2)} kg</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Inventory */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Inventory</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Opening Value</p>
                  <p className="text-xl font-semibold">{formatCurrency(data.openingInventoryValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closing Value</p>
                  <p className="text-xl font-semibold">{formatCurrency(data.closingInventoryValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closing Weight</p>
                  <p className="text-xl font-semibold">{data.closingInventoryKg.toFixed(2)} kg</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payments & Advances */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Payments & Advances</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier Payments</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(data.totalPaymentsToSuppliers)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Advances Given</p>
                  <p className="text-xl font-semibold text-orange-600">{formatCurrency(data.totalAdvancesGiven)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Operating Expenses</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(data.totalExpenses)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Cash Flow */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Cash Flow</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cash In</p>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(data.totalCashIn)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash Out</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(data.totalCashOut)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-xl font-semibold ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.netCashFlow)}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Profit & Loss */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Profit & Loss Statement</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-semibold">{formatCurrency(data.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost of Goods Sold</span>
                  <span className="font-semibold">({formatCurrency(data.costOfGoodsSold)})</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Gross Profit</span>
                  <span className="font-semibold">{formatCurrency(data.grossProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operating Expenses</span>
                  <span className="font-semibold">({formatCurrency(data.operatingExpenses)})</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">Net Profit</span>
                  <span className={`font-bold text-xl ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Balance Sheet */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Balance Sheet</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Assets</span>
                  <span className="font-semibold">{formatCurrency(data.totalAssets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Liabilities</span>
                  <span className="font-semibold">({formatCurrency(data.totalLiabilities)})</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">Equity</span>
                  <span className="font-bold text-xl">{formatCurrency(data.equity)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print-content {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default MonthlyReconciliation;
