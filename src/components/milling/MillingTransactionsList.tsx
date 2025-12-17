import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Calendar, Search } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, isThisYear, startOfDay, endOfDay } from 'date-fns';
import { useMillingData } from '@/hooks/useMillingData';
import { useAuth } from '@/contexts/AuthContext';
import MillingTransactionEditModal from './MillingTransactionEditModal';

const MillingTransactionsList = () => {
  const { transactions, loading, deleteTransaction } = useMillingData();
  const { isAdmin } = useAuth();
  const [editTransaction, setEditTransaction] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      // Period filter
      let matchesPeriod = true;
      switch (periodFilter) {
        case 'today':
          matchesPeriod = isToday(transactionDate);
          break;
        case 'week':
          matchesPeriod = isThisWeek(transactionDate, { weekStartsOn: 1 });
          break;
        case 'month':
          matchesPeriod = isThisMonth(transactionDate);
          break;
        case 'year':
          matchesPeriod = isThisYear(transactionDate);
          break;
        case 'all':
        default:
          matchesPeriod = true;
      }
      
      // Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        transaction.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesPeriod && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, periodFilter, searchQuery]);

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
      <CardHeader className="space-y-4">
        <div className="flex flex-row items-center justify-between">
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
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
                        {isAdmin() && (
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