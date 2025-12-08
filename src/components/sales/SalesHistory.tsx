import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSalesTransactions } from '@/hooks/useSalesTransactions';
import { format } from 'date-fns';
import { FileText, Download, Trash2, Calendar, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeletionRequest } from '@/hooks/useDeletionRequest';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditSalesTransactionDialog } from '@/components/v2/sales/EditSalesTransactionDialog';

const SalesHistory = () => {
  const { transactions, loading, getGRNFileUrl, fetchTransactions } = useSalesTransactions();
  const { isAdmin } = useAuth();
  const { submitDeletionRequest, isSubmitting } = useDeletionRequest();
  const { toast } = useToast();
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [editTransaction, setEditTransaction] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter transactions by date range
  const filteredTransactions = transactions.filter((transaction) => {
    if (!startDate && !endDate) return true;
    
    const transactionDate = new Date(transaction.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end) {
      return transactionDate >= start && transactionDate <= end;
    } else if (start) {
      return transactionDate >= start;
    } else if (end) {
      return transactionDate <= end;
    }
    return true;
  });

  const handleDownloadGRN = async (filePath: string, fileName: string) => {
    setDownloadingFile(filePath);
    try {
      const url = await getGRNFileUrl(filePath);
      if (url) {
        window.open(url, '_blank');
      }
    } finally {
      setDownloadingFile(null);
    }
  };

  const openDeleteDialog = (transaction: any) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    const success = await submitDeletionRequest(
      'sales_transactions',
      transactionToDelete.id,
      transactionToDelete,
      'Admin requested deletion of sales transaction',
      `Sale to ${transactionToDelete.customer} - ${transactionToDelete.weight}kg ${transactionToDelete.coffee_type} (${format(new Date(transactionToDelete.date), 'MMM dd, yyyy')})`
    );
    
    if (success) {
      toast({
        title: "Deletion Request Submitted",
        description: "The sales record deletion request has been sent for review.",
      });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading sales history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="start-date" className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="end-date" className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              End Date
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
        
        {filteredTransactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {transactions.length === 0 ? 'No sales transactions yet' : 'No transactions found for selected date range'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Coffee Type</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>GRN</TableHead>
                  {isAdmin() && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 10).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.customer}</TableCell>
                    <TableCell>{transaction.coffee_type}</TableCell>
                    <TableCell className="text-right">{transaction.weight.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      UGX {transaction.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      UGX {transaction.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{transaction.truck_details}</TableCell>
                    <TableCell className="text-sm">{transaction.driver_details}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.grn_file_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadGRN(transaction.grn_file_url!, transaction.grn_file_name || 'GRN')}
                          disabled={downloadingFile === transaction.grn_file_url}
                        >
                          {downloadingFile === transaction.grn_file_url ? (
                            <Download className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">No file</span>
                      )}
                    </TableCell>
                    {isAdmin() && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditTransaction(transaction)}
                            title="Edit sales record"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(transaction)}
                            disabled={isSubmitting}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete sales record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion Request</AlertDialogTitle>
            <AlertDialogDescription>
              {transactionToDelete && (
                <>
                  Are you sure you want to request deletion of this sales transaction?
                  <div className="mt-4 space-y-2 text-sm">
                    <p><strong>Customer:</strong> {transactionToDelete.customer}</p>
                    <p><strong>Date:</strong> {format(new Date(transactionToDelete.date), 'MMM dd, yyyy')}</p>
                    <p><strong>Coffee Type:</strong> {transactionToDelete.coffee_type}</p>
                    <p><strong>Weight:</strong> {transactionToDelete.weight.toLocaleString()} kg</p>
                    <p><strong>Amount:</strong> UGX {transactionToDelete.total_amount.toLocaleString()}</p>
                  </div>
                  <p className="mt-4 text-destructive">
                    This will submit a deletion request for admin review. The record will not be deleted immediately.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Submitting..." : "Submit Deletion Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editTransaction && (
        <EditSalesTransactionDialog
          transaction={editTransaction}
          open={!!editTransaction}
          onClose={() => setEditTransaction(null)}
          onSuccess={() => {
            setEditTransaction(null);
            fetchTransactions();
          }}
        />
      )}
    </Card>
  );
};

export default SalesHistory;
