import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useApprovalSystem } from '@/hooks/useApprovalSystem';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Clock, DollarSign, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExpenseRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: string;
  requestedby: string;
  status: string;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
}

const Expenses = () => {
  const { employee } = useAuth();
  const { createApprovalRequest, loading: submitting } = useApprovalSystem();
  const { requests, loading: loadingRequests } = useApprovalRequests();
  
  const [expenseType, setExpenseType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [userRequests, setUserRequests] = React.useState<ExpenseRequest[]>([]);
  const [loadingUserRequests, setLoadingUserRequests] = React.useState(false);

  // Fetch user's own expense requests
  React.useEffect(() => {
    const fetchUserRequests = async () => {
      if (!employee?.email) return;
      
      setLoadingUserRequests(true);
      try {
        const { data, error } = await supabase
          .from('approval_requests')
          .select('*')
          .eq('requestedby', employee.email)
          .eq('type', 'Expense Request')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUserRequests(data || []);
      } catch (error) {
        console.error('Error fetching user requests:', error);
        toast({
          title: "Error",
          description: "Failed to fetch your requests",
          variant: "destructive"
        });
      } finally {
        setLoadingUserRequests(false);
      }
    };

    fetchUserRequests();
  }, [employee?.email]);

  const expenseTypes = [
    { value: 'airtime', label: 'Airtime/Data' },
    { value: 'overtime', label: 'Overtime Payment' },
    { value: 'field_operations', label: 'Field Operations' },
    { value: 'transport', label: 'Transport/Fuel' },
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'meals', label: 'Meals/Refreshments' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'maintenance', label: 'Equipment/Vehicle Maintenance' },
    { value: 'utilities', label: 'Utilities Payment' },
    { value: 'other', label: 'Other Expenses' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseType || !amount || !description || !reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    const selectedType = expenseTypes.find(type => type.value === expenseType);
    const title = `${selectedType?.label || expenseType} Request - UGX ${numericAmount.toLocaleString()}`;

    const success = await createApprovalRequest(
      'Expense Request',
      title,
      description,
      numericAmount,
      {
        expenseType: expenseType,
        expenseCategory: selectedType?.label || expenseType,
        reason: reason,
        requestDate: new Date().toISOString(),
        department: employee?.department || 'General',
        priority: 'Normal'
      }
    );

    if (success) {
      // Reset form
      setExpenseType('');
      setAmount('');
      setDescription('');
      setReason('');
      
      // Refresh user requests
      const { data } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('requestedby', employee?.email)
        .eq('type', 'Expense Request')
        .order('created_at', { ascending: false });
      
      setUserRequests(data || []);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Expense Requests</h1>
            <p className="text-muted-foreground">Submit and track your expense requests</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submit New Expense Request */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Submit New Expense Request
              </CardTitle>
              <CardDescription>
                Request reimbursement for work-related expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Expense Type *</label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense type" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Amount (UGX) *</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    step="1000"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description *</label>
                  <Textarea
                    placeholder="Provide details about the expense"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Business Reason *</label>
                  <Textarea
                    placeholder="Explain why this expense is necessary for work"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Expense Requests
              </CardTitle>
              <CardDescription>
                Track the status of your submitted requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loadingUserRequests ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Loading your requests...</p>
                  </div>
                ) : userRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No expense requests yet</p>
                  </div>
                ) : (
                  userRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{request.title}</h4>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Amount: UGX {parseFloat(request.amount).toLocaleString()}</span>
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                      {request.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <strong className="text-red-700">Rejection Reason:</strong>
                          <p className="text-red-600">{request.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests for Admin/Finance */}
        {(employee?.permissions?.includes('Finance') || employee?.permissions?.includes('Administrator')) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending Expense Approvals
              </CardTitle>
              <CardDescription>
                Expense requests awaiting your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loadingRequests ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Loading pending requests...</p>
                  </div>
                ) : (
                  requests
                    .filter(request => request.type === 'Expense Request')
                    .map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{request.title}</h4>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Requested by:</strong> {request.requestedby}
                          </div>
                          <div>
                            <strong>Amount:</strong> UGX {parseFloat(request.amount).toLocaleString()}
                          </div>
                          <div>
                            <strong>Date:</strong> {formatDate(request.created_at)}
                          </div>
                          <div>
                            <strong>Priority:</strong> {request.priority}
                          </div>
                        </div>
                        {request.details?.editReason && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                            <strong className="text-blue-700">Business Reason:</strong>
                            <p className="text-blue-600">{request.details.editReason}</p>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Expenses;