import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalesTransactions } from '@/hooks/useSalesTransactions';
import { Eye, FileText, Printer, Download, Search, Calendar, Files, CalendarCheck, TrendingUp, Trash2, Edit } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SalesReportsList = () => {
  const { transactions, loading, getGRNFileUrl, updateTransaction, deleteTransaction } = useSalesTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  });
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());

  // Handle quick filters
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    const today = new Date();
    
    switch (filter) {
      case 'previous-month':
        const prevMonth = subMonths(today, 1);
        const startOfPrevMonth = startOfMonth(prevMonth);
        const endOfPrevMonth = endOfMonth(prevMonth);
        setSelectedDateRange({
          start: format(startOfPrevMonth, 'yyyy-MM-dd'),
          end: format(endOfPrevMonth, 'yyyy-MM-dd')
        });
        break;
      case 'current-month':
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = endOfMonth(today);
        setSelectedDateRange({
          start: format(startOfCurrentMonth, 'yyyy-MM-dd'),
          end: format(endOfCurrentMonth, 'yyyy-MM-dd')
        });
        break;
      case 'all':
        setSelectedDateRange({ start: '', end: '' });
        break;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.coffee_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.truck_details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.driver_details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = 
      (!selectedDateRange.start || transaction.date >= selectedDateRange.start) &&
      (!selectedDateRange.end || transaction.date <= selectedDateRange.end);
    
    return matchesSearch && matchesDateRange;
  });

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleDownloadGRN = async (transaction: any) => {
    if (!transaction.grn_file_url) return;
    
    try {
      // If it's a file path, get signed URL
      if (!transaction.grn_file_url.startsWith('http')) {
        const signedUrl = await getGRNFileUrl(transaction.grn_file_url);
        if (signedUrl) {
          window.open(signedUrl, '_blank');
        } else {
          toast.error("Failed to access GRN file");
        }
      } else {
        window.open(transaction.grn_file_url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading GRN:', error);
      toast.error("Failed to download GRN file");
    }
  };

  const handlePrintReport = (transaction: any) => {
    try {
      const { generateSalesTransactionPDF } = require('@/utils/pdfGenerator');
      generateSalesTransactionPDF(transaction);
      toast.success("Sales report PDF generated successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleBulkPDF = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No sales reports to generate PDF for");
      return;
    }
    
    try {
      const { generateMultipleSalesPDF } = require('@/utils/pdfGenerator');
      const title = quickFilter === 'previous-month' ? 'Previous Month Sales Reports' :
                    quickFilter === 'current-month' ? 'Current Month Sales Reports' :
                    `Sales Reports (${filteredTransactions.length} transactions)`;
      generateMultipleSalesPDF(filteredTransactions, title);
      toast.success(`Generated PDF with ${filteredTransactions.length} sales reports!`);
    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      toast.error("Failed to generate bulk PDF");
    }
  };

  const handleMonthlySummaryPDF = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No sales data available for summary report");
      return;
    }
    
    try {
      console.log('Generating monthly summary PDF with', filteredTransactions.length, 'transactions');
      const { generateMonthlySalesSummaryPDF } = require('@/utils/pdfGenerator');
      const periodName = quickFilter === 'previous-month' ? 'Previous Month Summary' :
                         quickFilter === 'current-month' ? 'Current Month Summary' :
                         'Sales Summary Report';
      console.log('Calling generateMonthlySalesSummaryPDF with period:', periodName);
      generateMonthlySalesSummaryPDF(filteredTransactions, periodName);
      toast.success("Monthly sales summary report generated!");
    } catch (error) {
      console.error('Error generating monthly summary PDF:', error);
      toast.error(`Failed to generate summary report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction({ ...transaction });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    
    try {
      await updateTransaction(editingTransaction.id, {
        date: editingTransaction.date,
        customer: editingTransaction.customer,
        coffee_type: editingTransaction.coffee_type,
        moisture: editingTransaction.moisture,
        weight: editingTransaction.weight,
        unit_price: editingTransaction.unit_price,
        total_amount: editingTransaction.total_amount,
        truck_details: editingTransaction.truck_details,
        driver_details: editingTransaction.driver_details
      });
      
      toast.success("Transaction updated successfully");
      setShowEditModal(false);
      setEditingTransaction(null);
    } catch (error) {
      toast.error("Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast.success("Transaction deleted successfully");
    } catch (error) {
      toast.error("Failed to delete transaction");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading sales reports...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sales Reports History
          </CardTitle>
          <CardDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>View and export sales transactions with attachments</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleMonthlySummaryPDF}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Monthly Summary Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkPDF}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2"
              >
                <Files className="h-4 w-4" />
                Export All ({filteredTransactions.length})
              </Button>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="space-y-4">
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={quickFilter === 'previous-month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('previous-month')}
                  className="flex items-center gap-2"
                >
                  <CalendarCheck className="h-4 w-4" />
                  Previous Month
                </Button>
                <Button
                  variant={quickFilter === 'current-month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('current-month')}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Current Month
                </Button>
                <Button
                  variant={quickFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('all')}
                  className="flex items-center gap-2"
                >
                  <Files className="h-4 w-4" />
                  All Reports
                </Button>
              </div>

              {/* Search and Date Range */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by customer, coffee type, truck, or driver..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={selectedDateRange.start}
                    onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={selectedDateRange.end}
                    onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={selectedTransactionIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactionIds(new Set(filteredTransactions.map(t => t.id)));
                          } else {
                            setSelectedTransactionIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Coffee Type</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Amount (UGX)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No sales transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow 
                        key={transaction.id}
                        className={selectedTransactionIds.has(transaction.id) ? "bg-muted/50" : ""}
                      >
                        <TableCell>
                          <input 
                            type="checkbox" 
                            className="rounded"
                            checked={selectedTransactionIds.has(transaction.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedTransactionIds);
                              if (e.target.checked) {
                                newSelected.add(transaction.id);
                              } else {
                                newSelected.delete(transaction.id);
                              }
                              setSelectedTransactionIds(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(transaction.date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{transaction.customer}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.coffee_type}</Badge>
                        </TableCell>
                        <TableCell>{transaction.weight} kg</TableCell>
                        <TableCell>
                          {transaction.total_amount.toLocaleString('en-UG')} UGX
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={transaction.status === 'Completed' ? 'default' : 'secondary'}
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(transaction)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintReport(transaction)}
                              title="Generate PDF"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Selected Actions */}
            {selectedTransactionIds.size > 0 && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedTransactionIds.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTransactionIds(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex gap-2">
                  {selectedTransactionIds.size === 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const transactionId = Array.from(selectedTransactionIds)[0];
                        const transaction = filteredTransactions.find(t => t.id === transactionId);
                        if (transaction) handleEditTransaction(transaction);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Report
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete {selectedTransactionIds.size > 1 ? 'Reports' : 'Report'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedTransactionIds.size > 1 ? 'Transactions' : 'Transaction'}</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedTransactionIds.size} selected sales transaction{selectedTransactionIds.size > 1 ? 's' : ''}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              for (const id of selectedTransactionIds) {
                                await handleDeleteTransaction(id);
                              }
                              setSelectedTransactionIds(new Set());
                            } catch (error) {
                              toast.error("Failed to delete some transactions");
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* Summary */}
            {filteredTransactions.length > 0 && (
              <div className="space-y-6 pt-4 border-t">
                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {filteredTransactions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {filteredTransactions.reduce((sum, t) => sum + t.weight, 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Kg Sold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Revenue (UGX)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {filteredTransactions.filter(t => t.grn_file_url).length}
                    </div>
                    <div className="text-sm text-muted-foreground">With GRN Files</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sales Transaction Details</DialogTitle>
            <DialogDescription>
              View detailed information about this sales transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedTransaction.date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.customer}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Coffee Type</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.coffee_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Moisture</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.moisture || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Weight</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.weight} kg</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Unit Price</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.unit_price.toLocaleString()} UGX/kg</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Amount</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.total_amount.toLocaleString()} UGX</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Truck Details</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.truck_details}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Driver Details</label>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.driver_details}</p>
                </div>
              </div>
              {selectedTransaction.grn_file_url && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium">GRN File</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadGRN(selectedTransaction)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {selectedTransaction.grn_file_name || 'Download GRN'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Sales Transaction</DialogTitle>
            <DialogDescription>
              Update the details of this sales transaction
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editingTransaction.date}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input
                    value={editingTransaction.customer}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, customer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coffee Type</Label>
                  <Select 
                    value={editingTransaction.coffee_type} 
                    onValueChange={(value) => setEditingTransaction({ ...editingTransaction, coffee_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arabica">Arabica</SelectItem>
                      <SelectItem value="Robusta">Robusta</SelectItem>
                      <SelectItem value="Screen 18">Screen 18</SelectItem>
                      <SelectItem value="Screen 15">Screen 15</SelectItem>
                      <SelectItem value="FAQ">FAQ</SelectItem>
                      <SelectItem value="Bugisu AA">Bugisu AA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moisture (%)</Label>
                  <Input
                    value={editingTransaction.moisture || ''}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, moisture: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={editingTransaction.weight}
                    onChange={(e) => {
                      const weight = parseFloat(e.target.value) || 0;
                      setEditingTransaction({ 
                        ...editingTransaction, 
                        weight,
                        total_amount: weight * editingTransaction.unit_price
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price (UGX/kg)</Label>
                  <Input
                    type="number"
                    value={editingTransaction.unit_price}
                    onChange={(e) => {
                      const unitPrice = parseFloat(e.target.value) || 0;
                      setEditingTransaction({ 
                        ...editingTransaction, 
                        unit_price: unitPrice,
                        total_amount: editingTransaction.weight * unitPrice
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount (UGX)</Label>
                  <Input
                    type="number"
                    value={editingTransaction.total_amount}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={editingTransaction.status} 
                    onValueChange={(value) => setEditingTransaction({ ...editingTransaction, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Truck Details</Label>
                  <Input
                    value={editingTransaction.truck_details}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, truck_details: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Driver Details</Label>
                  <Input
                    value={editingTransaction.driver_details}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, driver_details: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalesReportsList;