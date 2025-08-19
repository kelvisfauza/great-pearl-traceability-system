import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMillingData } from "@/hooks/useMillingData";
import { format, isWithinInterval, parseISO } from 'date-fns';
import { CalendarIcon, Printer, Download, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useReactToPrint } from 'react-to-print';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';

interface MillingCustomerReportModalProps {
  customer: any;
  onClose: () => void;
}

const MillingCustomerReportModal = ({ customer, onClose }: MillingCustomerReportModalProps) => {
  const { transactions, cashTransactions } = useMillingData();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Customer Report - ${customer.full_name}`,
  });

  // Get customer transactions within date range
  const getFilteredTransactions = () => {
    const customerTxns = transactions?.filter(t => t.customer_id === customer.id) || [];
    const customerCashTxns = cashTransactions?.filter(t => t.customer_id === customer.id) || [];
    
    let allTransactions: any[] = [
      ...customerTxns.map(t => ({ ...t, type: 'service', date: parseISO(t.date) })),
      ...customerCashTxns.map(t => ({ ...t, type: 'payment', date: parseISO(t.date) }))
    ];

    // Filter by date range
    if (dateRange.from && dateRange.to) {
      allTransactions = allTransactions.filter(t => 
        isWithinInterval(t.date, { start: dateRange.from!, end: dateRange.to! })
      );
    }

    return allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate summary statistics
  const summary = {
    totalServices: filteredTransactions.filter(t => t.type === 'service').length,
    totalPayments: filteredTransactions.filter(t => t.type === 'payment').length,
    totalServiceAmount: filteredTransactions
      .filter(t => t.type === 'service')
      .reduce((sum, t) => sum + Number((t as any).total_amount), 0),
    totalPaymentAmount: filteredTransactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + Number((t as any).amount_paid), 0),
    totalKgsProcessed: filteredTransactions
      .filter(t => t.type === 'service')
      .reduce((sum, t) => sum + Number((t as any).kgs_hulled || 0), 0),
  };

  const netBalance = summary.totalServiceAmount - summary.totalPaymentAmount;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={cn("h-4 w-4", i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} 
      />
    ));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Report - {customer.full_name}</DialogTitle>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd, yyyy")
                    )
                  ) : (
                    "Select date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange as any}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handlePrint} size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef} className="space-y-6 p-4">
          {/* Print Header */}
          <div className="print:block hidden">
            <StandardPrintHeader
              title="Customer Transaction Report"
              subtitle="Milling Department"
              additionalInfo={`Customer: ${customer.full_name}`}
            />
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/20">
            <div>
              <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <p className="font-medium">{customer.full_name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <p className="font-medium">{customer.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Address:</span>
                  <p className="font-medium">{customer.address || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={customer.status === 'Active' ? 'default' : 'secondary'}>
                    {customer.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Account Summary</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Current Balance:</span>
                  <p className="font-medium text-lg">
                    UGX {Number(customer.current_balance).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Opening Balance:</span>
                  <p className="font-medium">
                    UGX {Number(customer.opening_balance).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Report Period:</span>
                  <p className="font-medium">
                    {dateRange.from && dateRange.to 
                      ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                      : 'All time'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Period Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Period Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.totalServices}</p>
                <p className="text-sm text-muted-foreground">Services</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{summary.totalPayments}</p>
                <p className="text-sm text-muted-foreground">Payments</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-600">{summary.totalKgsProcessed.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Kgs Processed</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {summary.totalServiceAmount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Charges</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  netBalance >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {netBalance.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Net Balance</p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
            {filteredTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction, index) => (
                    <TableRow key={`${transaction.type}-${transaction.id}`}>
                      <TableCell>{format(transaction.date, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'service' ? 'default' : 'secondary'}>
                          {transaction.type === 'service' ? 'Service' : 'Payment'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'service' 
                          ? `${(transaction as any).transaction_type} service`
                          : `Payment via ${(transaction as any).payment_method}`
                        }
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'service' 
                          ? `${(transaction as any).kgs_hulled} kg`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'service' 
                          ? `UGX ${Number((transaction as any).rate_per_kg).toLocaleString()}/kg`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-medium">
                        UGX {Number(
                          transaction.type === 'service' 
                            ? (transaction as any).total_amount 
                            : (transaction as any).amount_paid
                        ).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'service' ? (
                          <span className="text-red-600 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Debit
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            Credit
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No transactions found for the selected period
              </div>
            )}
          </div>

          {/* Print Footer */}
          <div className="print:block hidden footer">
            <p>This is a computer-generated report. No signature required.</p>
            <p>Generated by Great Pearl Coffee Factory Management System</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MillingCustomerReportModal;