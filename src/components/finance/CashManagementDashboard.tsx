import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  PlusCircle, 
  MinusCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  CalendarDays
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CashTransaction {
  id: string;
  type: 'assignment' | 'payment' | 'return' | 'expense';
  amount: number;
  description: string;
  assignedBy?: string;
  processedBy: string;
  date: string;
  time: string;
  status: 'pending' | 'completed' | 'approved';
  approvalRequired?: boolean;
}

interface CashManagementDashboardProps {
  formatCurrency: (amount: number) => string;
  availableCash: number;
  onCashTransaction: (transaction: Omit<CashTransaction, 'id' | 'date' | 'time'>) => void;
}

const CashManagementDashboard: React.FC<CashManagementDashboardProps> = ({
  formatCurrency,
  availableCash,
  onCashTransaction
}) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([
    {
      id: '1',
      type: 'assignment',
      amount: 500000,
      description: 'Daily float assignment from manager',
      assignedBy: 'Operations Manager',
      processedBy: 'Finance Officer',
      date: new Date().toISOString().split('T')[0],
      time: '08:00 AM',
      status: 'completed'
    },
    {
      id: '2',
      type: 'payment',
      amount: 45000,
      description: 'Cash payment to John Doe - Batch #CF001',
      processedBy: 'Finance Officer',
      date: new Date().toISOString().split('T')[0],
      time: '10:30 AM',
      status: 'completed'
    }
  ]);

  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [assignmentAmount, setAssignmentAmount] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');

  const handleCashAssignment = () => {
    if (!assignmentAmount || !assignmentDescription) return;

    const newTransaction: Omit<CashTransaction, 'id' | 'date' | 'time'> = {
      type: 'assignment',
      amount: parseFloat(assignmentAmount),
      description: assignmentDescription,
      assignedBy: employee?.name || 'Manager',
      processedBy: 'Finance Department',
      status: 'completed'
    };

    onCashTransaction(newTransaction);
    
    setCashTransactions(prev => [
      {
        ...newTransaction,
        id: `txn_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    toast({
      title: "Cash Assigned",
      description: `${formatCurrency(parseFloat(assignmentAmount))} assigned to finance department`
    });

    setAssignmentAmount('');
    setAssignmentDescription('');
    setShowAssignmentDialog(false);
  };

  const handleCashRequest = () => {
    if (!requestAmount || !requestReason) return;

    const newTransaction: Omit<CashTransaction, 'id' | 'date' | 'time'> = {
      type: 'assignment',
      amount: parseFloat(requestAmount),
      description: `Cash request: ${requestReason}`,
      processedBy: employee?.name || 'Finance Officer',
      status: 'pending',
      approvalRequired: true
    };

    setCashTransactions(prev => [
      {
        ...newTransaction,
        id: `req_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    toast({
      title: "Cash Request Submitted",
      description: `Request for ${formatCurrency(parseFloat(requestAmount))} submitted for approval`
    });

    setRequestAmount('');
    setRequestReason('');
    setShowRequestDialog(false);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <PlusCircle className="h-4 w-4 text-green-600" />;
      case 'payment': return <MinusCircle className="h-4 w-4 text-red-600" />;
      case 'return': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'expense': return <TrendingDown className="h-4 w-4 text-orange-600" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const todaysTransactions = cashTransactions.filter(txn => 
    txn.date === new Date().toISOString().split('T')[0]
  );

  const totalAssigned = cashTransactions
    .filter(txn => txn.type === 'assignment' && txn.status === 'completed')
    .reduce((sum, txn) => sum + txn.amount, 0);

  const totalSpent = cashTransactions
    .filter(txn => (txn.type === 'payment' || txn.type === 'expense') && txn.status === 'completed')
    .reduce((sum, txn) => sum + txn.amount, 0);

  const pendingRequests = cashTransactions.filter(txn => txn.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Cash Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Available Cash</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(availableCash)}</p>
              </div>
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Assigned</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAssigned)}</p>
                <p className="text-xs text-blue-600">This period</p>
              </div>
              <PlusCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Spent</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(totalSpent)}</p>
                <p className="text-xs text-red-600">This period</p>
              </div>
              <MinusCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingRequests.length}</p>
                <p className="text-xs text-yellow-600">Requests</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Management Actions
          </CardTitle>
          <CardDescription>Manage cash assignments and requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Assign Cash
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Cash to Finance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="assignment-amount">Amount</Label>
                    <Input
                      id="assignment-amount"
                      type="number"
                      value={assignmentAmount}
                      onChange={(e) => setAssignmentAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignment-description">Description</Label>
                    <Textarea
                      id="assignment-description"
                      value={assignmentDescription}
                      onChange={(e) => setAssignmentDescription(e.target.value)}
                      placeholder="Describe the cash assignment..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAssignmentDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCashAssignment} className="flex-1">
                      Assign Cash
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Request Cash
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Additional Cash</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="request-amount">Amount Needed</Label>
                    <Input
                      id="request-amount"
                      type="number"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      placeholder="Enter amount needed"
                    />
                  </div>
                  <div>
                    <Label htmlFor="request-reason">Reason</Label>
                    <Textarea
                      id="request-reason"
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Explain why additional cash is needed..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowRequestDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCashRequest} className="flex-1">
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Cash Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Transaction History</CardTitle>
          <CardDescription>Track all cash movements and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">Today ({todaysTransactions.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className="capitalize">{transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell className={`font-bold ${
                        transaction.type === 'assignment' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'assignment' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{transaction.time}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {transaction.processedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className="capitalize">{transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="font-bold text-yellow-600">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {transaction.processedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pendingRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No pending cash requests</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className="capitalize">{transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell className={`font-bold ${
                        transaction.type === 'assignment' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'assignment' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {transaction.processedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashManagementDashboard;