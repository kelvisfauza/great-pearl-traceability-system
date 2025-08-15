import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useMillingData } from '@/hooks/useMillingData';
import MillingTransactionEditModal from './MillingTransactionEditModal';

const MillingTransactionsList = () => {
  const { transactions, loading } = useMillingData();
  const [editTransaction, setEditTransaction] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>KGs Hulled</TableHead>
                  <TableHead>Rate/KG</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.customer_name}
                    </TableCell>
                    <TableCell>{transaction.kgs_hulled.toLocaleString()} kg</TableCell>
                    <TableCell>UGX {transaction.rate_per_kg.toLocaleString()}</TableCell>
                    <TableCell>UGX {transaction.total_amount.toLocaleString()}</TableCell>
                    <TableCell>UGX {transaction.amount_paid.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={transaction.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                        UGX {transaction.balance.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.balance > 0 ? 'destructive' : 'default'}>
                        {transaction.balance > 0 ? 'Pending' : 'Paid'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditTransaction(transaction);
                          setEditModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <MillingTransactionEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditTransaction(null);
        }}
        transaction={editTransaction}
      />
    </Card>
  );
};

export default MillingTransactionsList;