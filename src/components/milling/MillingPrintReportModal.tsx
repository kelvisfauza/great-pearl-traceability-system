import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMillingData } from '@/hooks/useMillingData';

interface MillingPrintReportModalProps {
  open: boolean;
  onClose: () => void;
}

const MillingPrintReportModal: React.FC<MillingPrintReportModalProps> = ({ open, onClose }) => {
  const { customers, transactions, cashTransactions, stats } = useMillingData();
  const printRef = useRef<HTMLDivElement>(null);
  
  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('summary');
  const [transactionType, setTransactionType] = useState<string>('all');

  const getFilteredData = () => {
    let filteredTransactions = transactions;
    let filteredCashTransactions = cashTransactions;

    // Date range filter
    if (startDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= startDate);
      filteredCashTransactions = filteredCashTransactions.filter(t => new Date(t.date) >= startDate);
    }
    if (endDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= endDate);
      filteredCashTransactions = filteredCashTransactions.filter(t => new Date(t.date) <= endDate);
    }

    // Customer filter
    if (selectedCustomer !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.customer_id === selectedCustomer);
      filteredCashTransactions = filteredCashTransactions.filter(t => t.customer_id === selectedCustomer);
    }

    return {
      transactions: filteredTransactions,
      cashTransactions: filteredCashTransactions,
      summary: {
        totalKgsHulled: filteredTransactions.reduce((sum, t) => sum + t.kgs_hulled, 0),
        totalRevenue: filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0),
        totalCashReceived: filteredTransactions.reduce((sum, t) => sum + t.amount_paid, 0) + 
                          filteredCashTransactions.reduce((sum, t) => sum + t.amount_paid, 0),
        totalTransactions: filteredTransactions.length,
        totalPayments: filteredCashTransactions.length
      }
    };
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
          <title>Milling Department Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { height: 60px; width: auto; max-width: 120px; }
            .company-name { font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-bottom: 10px; }
            .company-address { font-weight: bold; text-align: center; margin-bottom: 15px; }
            .report-title { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; text-transform: uppercase; }
            .filter-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-card { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
            .summary-value { font-size: 24px; font-weight: bold; color: #2563eb; }
            .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .separator { border-top: 2px solid #000; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 11px; color: #666; text-align: center; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredData = getFilteredData();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold mb-4">
            Generate Milling Report
          </DialogTitle>
        </DialogHeader>

        {/* Filters Section */}
        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Report Filters
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="customer-balances">Customer Balances</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Print Preview */}
        <div ref={printRef}>
          <div className="header">
            <div className="mb-4">
              <img src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" alt="Great Pearl Coffee Factory Logo" className="mx-auto h-16 w-auto mb-2 logo" />
            </div>
            <h1 className="company-name">GREAT PEARL COFFEE FACTORY</h1>
            <div className="company-address">
              <p>+256781121639 / +256778536681</p>
              <p>www.greatpearlcoffee.com</p>
              <p>greatpearlcoffee@gmail.com</p>
            </div>
            <div className="separator"></div>
            <h2 className="report-title">MILLING DEPARTMENT REPORT</h2>
          </div>

          <div className="filter-info">
            <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Report Parameters:</h3>
            <p><strong>Report Type:</strong> {reportType.replace('-', ' ').toUpperCase()}</p>
            <p><strong>Date Range:</strong> {startDate ? format(startDate, 'PPP') : 'All time'} - {endDate ? format(endDate, 'PPP') : 'Present'}</p>
            <p><strong>Customer Filter:</strong> {selectedCustomer === 'all' ? 'All Customers' : customers.find(c => c.id === selectedCustomer)?.full_name}</p>
            <p><strong>Generated On:</strong> {format(new Date(), 'PPP')} at {format(new Date(), 'p')}</p>
          </div>

          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-value">{filteredData.summary.totalKgsHulled.toLocaleString()}</div>
              <div className="summary-label">Total KGs Hulled</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">UGX {filteredData.summary.totalRevenue.toLocaleString()}</div>
              <div className="summary-label">Total Revenue</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">UGX {filteredData.summary.totalCashReceived.toLocaleString()}</div>
              <div className="summary-label">Cash Received</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{filteredData.summary.totalTransactions}</div>
              <div className="summary-label">Total Transactions</div>
            </div>
          </div>

          {/* Detailed Content Based on Report Type */}
          {reportType === 'detailed' && (
            <>
              <h3 style={{ fontWeight: 'bold', marginTop: '30px', marginBottom: '15px' }}>Transaction Details</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>KGs Hulled</th>
                    <th>Rate/KG</th>
                    <th>Total Amount</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.transactions.map((transaction, index) => (
                    <tr key={index}>
                      <td>{format(new Date(transaction.date), 'dd/MM/yyyy')}</td>
                      <td>{transaction.customer_name}</td>
                      <td className="text-right">{transaction.kgs_hulled.toLocaleString()}</td>
                      <td className="text-right">UGX {transaction.rate_per_kg.toLocaleString()}</td>
                      <td className="text-right">UGX {transaction.total_amount.toLocaleString()}</td>
                      <td className="text-right">UGX {transaction.amount_paid.toLocaleString()}</td>
                      <td className="text-right">UGX {transaction.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredData.cashTransactions.length > 0 && (
                <>
                  <h3 style={{ fontWeight: 'bold', marginTop: '30px', marginBottom: '15px' }}>Payment Details</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount Paid</th>
                        <th>Payment Method</th>
                        <th>Previous Balance</th>
                        <th>New Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.cashTransactions.map((payment, index) => (
                        <tr key={index}>
                          <td>{format(new Date(payment.date), 'dd/MM/yyyy')}</td>
                          <td>{payment.customer_name}</td>
                          <td className="text-right">UGX {payment.amount_paid.toLocaleString()}</td>
                          <td>{payment.payment_method}</td>
                          <td className="text-right">UGX {payment.previous_balance.toLocaleString()}</td>
                          <td className="text-right">UGX {payment.new_balance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}

          {reportType === 'customer-balances' && (
            <>
              <h3 style={{ fontWeight: 'bold', marginTop: '30px', marginBottom: '15px' }}>Customer Balance Summary</h3>
              <table>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Opening Balance</th>
                    <th>Current Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers
                    .filter(c => selectedCustomer === 'all' || c.id === selectedCustomer)
                    .map((customer, index) => (
                    <tr key={index}>
                      <td>{customer.full_name}</td>
                      <td>{customer.phone || 'N/A'}</td>
                      <td className="text-right">UGX {customer.opening_balance.toLocaleString()}</td>
                      <td className="text-right">UGX {customer.current_balance.toLocaleString()}</td>
                      <td className="text-center">{customer.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="footer">
            <div className="separator"></div>
            <p>This report is system-generated and valid without a signature.</p>
            <p>Generated by: Great Pearl Coffee Factory Milling Management System</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 no-print">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MillingPrintReportModal;