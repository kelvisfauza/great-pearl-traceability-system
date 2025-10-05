import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Printer } from "lucide-react";
import { format } from "date-fns";
import { useDayBookData } from "@/hooks/useDayBookData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";
import { getStandardPrintStyles } from "@/utils/printStyles";

const DayBook = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { dayBookData, loading } = useDayBookData(selectedDate);
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=900,height=1200');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Day Book - ${format(selectedDate, "PPP")}</title>
          <style>${getStandardPrintStyles()}</style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dayBookData) return null;

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Day Book Report</CardTitle>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Print Content */}
      <div ref={printRef}>
        <StandardPrintHeader 
          title="DAY BOOK REPORT"
          subtitle={`Financial Activities Summary - ${format(selectedDate, "PPP")}`}
          includeDate={false}
        />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dayBookData.openingBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total Cash In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(dayBookData.totalCashIn)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Cash Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(dayBookData.totalCashOut)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dayBookData.closingBalance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cash In Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Cash In Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {dayBookData.cashInTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookData.cashInTransactions.map((tx, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{tx.type}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>{tx.reference}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="font-bold">Total Cash In</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(dayBookData.totalCashIn)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No cash in transactions</p>
          )}
        </CardContent>
      </Card>

      {/* Cash Out Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Cash Out Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {dayBookData.cashOutTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookData.cashOutTransactions.map((tx, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{tx.type}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>{tx.reference}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="font-bold">Total Cash Out</TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    {formatCurrency(dayBookData.totalCashOut)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No cash out transactions</p>
          )}
        </CardContent>
      </Card>

      {/* Suppliers Paid */}
      <Card>
        <CardHeader>
          <CardTitle>Suppliers Paid</CardTitle>
        </CardHeader>
        <CardContent>
          {dayBookData.suppliersPaid.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookData.suppliersPaid.map((supplier, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{supplier.supplier}</TableCell>
                    <TableCell>{supplier.batchNumber}</TableCell>
                    <TableCell className="text-right">{formatCurrency(supplier.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No suppliers paid today</p>
          )}
        </CardContent>
      </Card>

      {/* Advances Given */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Advances Given</CardTitle>
        </CardHeader>
        <CardContent>
          {dayBookData.advancesGiven.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookData.advancesGiven.map((advance, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{advance.supplier}</TableCell>
                    <TableCell>{advance.reference}</TableCell>
                    <TableCell className="text-right">{formatCurrency(advance.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No advances given today</p>
          )}
        </CardContent>
      </Card>

      {/* Overtime Advances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Salary Advances (Overtime)</CardTitle>
            <div className="text-lg font-semibold">
              Total: {formatCurrency(dayBookData.totalOvertimeAdvances)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dayBookData.overtimeAdvances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookData.overtimeAdvances.map((advance, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{advance.employee}</TableCell>
                    <TableCell>
                      <span className="capitalize">{advance.status.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(advance.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-bold">Total Overtime Advances</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(dayBookData.totalOvertimeAdvances)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No overtime advances requested today</p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default DayBook;