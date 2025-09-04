import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, FileText, Download, Search } from 'lucide-react';
import { useSalesTransactions } from '@/hooks/useSalesTransactions';
import { format } from 'date-fns';

const SalesReportsList = () => {
  const { transactions, loading } = useSalesTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredTransactions = transactions.filter(transaction =>
    transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.coffee_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleDownloadGRN = async (transaction: any) => {
    if (transaction.grn_file_url) {
      const link = document.createElement('a');
      link.href = transaction.grn_file_url;
      link.download = transaction.grn_file_name || `GRN-${transaction.id}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return <div>Loading sales reports...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Reports</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                View all sales transactions and their GRN documents
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by customer or coffee type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Coffee Type</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GRN</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{transaction.customer}</TableCell>
                  <TableCell>{transaction.coffee_type}</TableCell>
                  <TableCell>{transaction.weight.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    UGX {transaction.total_amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.grn_file_url ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Available</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No GRN</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {transaction.grn_file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadGRN(transaction)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sales transactions found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sales Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Date</h4>
                  <p>{format(new Date(selectedTransaction.date), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Customer</h4>
                  <p>{selectedTransaction.customer}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Coffee Type</h4>
                  <p>{selectedTransaction.coffee_type}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Weight</h4>
                  <p>{selectedTransaction.weight.toLocaleString()} kg</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Unit Price</h4>
                  <p>UGX {selectedTransaction.unit_price.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Total Amount</h4>
                  <p className="font-semibold text-green-600">
                    UGX {selectedTransaction.total_amount.toLocaleString()}
                  </p>
                </div>
                {selectedTransaction.moisture && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600">Moisture</h4>
                    <p>{selectedTransaction.moisture}%</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Status</h4>
                  <Badge variant={selectedTransaction.status === 'Completed' ? 'default' : 'secondary'}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Truck Details</h4>
                  <p>{selectedTransaction.truck_details}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Driver Details</h4>
                  <p>{selectedTransaction.driver_details}</p>
                </div>
              </div>

              {selectedTransaction.grn_file_url && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-gray-600 mb-2">GRN Document</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span>{selectedTransaction.grn_file_name || 'GRN Document'}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadGRN(selectedTransaction)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalesReportsList;