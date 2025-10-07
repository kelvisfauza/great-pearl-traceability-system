import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSalesTransactions } from '@/hooks/useSalesTransactions';
import { format } from 'date-fns';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const SalesHistory = () => {
  const { transactions, loading, getGRNFileUrl } = useSalesTransactions();
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

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
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No sales transactions yet</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((transaction) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesHistory;
