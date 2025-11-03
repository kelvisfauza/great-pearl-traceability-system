import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Calendar } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, isThisYear, startOfDay, endOfDay } from 'date-fns';
import { useMillingData } from '@/hooks/useMillingData';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import MillingTransactionEditModal from './MillingTransactionEditModal';

const MillingTransactionsList = () => {
  const { transactions, loading, deleteTransaction } = useMillingData();
  const { canDeleteEmployees } = useRoleBasedAccess();
  const [editTransaction, setEditTransaction] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('today');

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      switch (periodFilter) {
        case 'today':
          return isToday(transactionDate);
        case 'week':
          return isThisWeek(transactionDate, { weekStartsOn: 1 });
        case 'month':
          return isThisMonth(transactionDate);
        case 'year':
          return isThisYear(transactionDate);
        case 'all':
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, periodFilter]);

  const handleDelete = async (transaction: any) => {
    if (window.confirm(`Are you sure you want to delete this transaction for ${transaction.customer_name}?`)) {
      try {
        await deleteTransaction(transaction.id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Recent Transactions</CardTitle>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No transactions found for {periodFilter === 'today' ? 'today' : `this ${periodFilter}`}
          </p>
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
                {filteredTransactions.map((transaction) => (
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
                      <div className="flex gap-2">
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
                        {canDeleteEmployees && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(transaction)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
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