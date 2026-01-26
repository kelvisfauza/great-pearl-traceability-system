import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSalaryAdvances, SalaryAdvance } from '@/hooks/useSalaryAdvances';
import { toast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Plus, 
  Users, 
  TrendingDown, 
  CheckCircle, 
  Clock,
  DollarSign,
  History,
  AlertTriangle,
  Search
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
}

const SalaryAdvanceManagement = () => {
  const { employee: currentUser } = useAuth();
  const { advances, loading, fetchAllAdvances, createAdvance, fetchAdvancePayments } = useSalaryAdvances();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvance | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state for new advance
  const [newAdvance, setNewAdvance] = useState({
    employeeEmail: '',
    amount: '',
    minimumPayment: '40000',
    reason: ''
  });

  useEffect(() => {
    fetchAllAdvances();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, department, position, salary')
        .eq('status', 'Active')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCreateAdvance = async () => {
    if (!newAdvance.employeeEmail || !newAdvance.amount || !newAdvance.minimumPayment) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const selectedEmployee = employees.find(e => e.email === newAdvance.employeeEmail);
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select a valid employee",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(newAdvance.amount);
    const minPayment = parseFloat(newAdvance.minimumPayment);

    if (minPayment > amount) {
      toast({
        title: "Invalid Amount",
        description: "Minimum payment cannot exceed the advance amount",
        variant: "destructive"
      });
      return;
    }

    try {
      await createAdvance(
        selectedEmployee.email,
        selectedEmployee.name,
        amount,
        minPayment,
        newAdvance.reason,
        currentUser?.email || 'Admin'
      );

      setShowAddModal(false);
      setNewAdvance({ employeeEmail: '', amount: '', minimumPayment: '40000', reason: '' });
      fetchAllAdvances();
    } catch (error) {
      console.error('Error creating advance:', error);
    }
  };

  const handleViewPayments = async (advance: SalaryAdvance) => {
    setSelectedAdvance(advance);
    const paymentHistory = await fetchAdvancePayments(advance.id);
    setPayments(paymentHistory);
    setShowPaymentsModal(true);
  };

  const filteredAdvances = advances.filter(advance => {
    const matchesSearch = 
      advance.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advance.employee_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || advance.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalActive: advances.filter(a => a.status === 'active').length,
    totalPaidOff: advances.filter(a => a.status === 'paid_off').length,
    totalOutstanding: advances
      .filter(a => a.status === 'active')
      .reduce((sum, a) => sum + a.remaining_balance, 0),
    totalOriginal: advances.reduce((sum, a) => sum + a.original_amount, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Salary Advance Management
          </h2>
          <p className="text-muted-foreground">Award and track salary advances for employees</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Award New Advance
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Advances</p>
                <p className="text-2xl font-bold">{stats.totalActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Off</p>
                <p className="text-2xl font-bold">{stats.totalPaidOff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-xl font-bold">UGX {stats.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Awarded</p>
                <p className="text-xl font-bold">UGX {stats.totalOriginal.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paid_off">Paid Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Advances Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Salary Advances</CardTitle>
          <CardDescription>
            Track and manage employee salary advances
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading advances...</p>
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Advances Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? "No advances match your search criteria" 
                  : "No salary advances have been awarded yet"}
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Award First Advance
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Original Amount</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Min Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Awarded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{advance.employee_name}</p>
                          <p className="text-xs text-muted-foreground">{advance.employee_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        UGX {advance.original_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={advance.remaining_balance > 0 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                          UGX {advance.remaining_balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        UGX {advance.minimum_payment.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          advance.status === 'active' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                        }>
                          {advance.status === 'active' ? 'Active' : 'Paid Off'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(advance.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewPayments(advance)}
                          className="gap-1"
                        >
                          <History className="h-3 w-3" />
                          Payments
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Advance Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Award Salary Advance
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-xs text-orange-800">
                When you award an advance, the employee will be required to make payments towards it whenever they request salary.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select 
                value={newAdvance.employeeEmail} 
                onValueChange={(value) => setNewAdvance({ ...newAdvance, employeeEmail: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.email}>
                      <div className="flex flex-col">
                        <span>{emp.name}</span>
                        <span className="text-xs text-muted-foreground">{emp.department} - {emp.position}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Advance Amount (UGX)</Label>
              <Input
                type="number"
                placeholder="e.g., 200000"
                value={newAdvance.amount}
                onChange={(e) => setNewAdvance({ ...newAdvance, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Payment Per Salary (UGX)</Label>
              <Input
                type="number"
                placeholder="e.g., 40000"
                value={newAdvance.minimumPayment}
                onChange={(e) => setNewAdvance({ ...newAdvance, minimumPayment: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The minimum amount the employee must pay from each salary request
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reason for Advance</Label>
              <Textarea
                placeholder="Describe why this advance is being given..."
                value={newAdvance.reason}
                onChange={(e) => setNewAdvance({ ...newAdvance, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdvance}>
              Award Advance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Modal */}
      <Dialog open={showPaymentsModal} onOpenChange={setShowPaymentsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Payment History - {selectedAdvance?.employee_name}
            </DialogTitle>
          </DialogHeader>

          {selectedAdvance && (
            <div className="space-y-4">
              {/* Advance Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Original Amount</p>
                  <p className="font-bold">UGX {selectedAdvance.original_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="font-bold text-green-600">
                    UGX {(selectedAdvance.original_amount - selectedAdvance.remaining_balance).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="font-bold text-orange-600">
                    UGX {selectedAdvance.remaining_balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Repayment Progress</span>
                  <span>
                    {Math.round(((selectedAdvance.original_amount - selectedAdvance.remaining_balance) / selectedAdvance.original_amount) * 100)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ 
                      width: `${((selectedAdvance.original_amount - selectedAdvance.remaining_balance) / selectedAdvance.original_amount) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Payment History */}
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No payments recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          UGX {payment.amount_paid.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            payment.status === 'approved' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.approved_by || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryAdvanceManagement;
