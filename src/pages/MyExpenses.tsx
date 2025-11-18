import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, ShoppingCart, Coffee, Wallet, Clock, CheckCircle, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useAttendance } from '@/hooks/useAttendance';
import Layout from '@/components/Layout';

interface ExpenseRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  finance_approved_at?: string | null;
  admin_approved_at?: string | null;
  rejection_reason?: string | null;
}

const MyExpenses = () => {
  const { employee, user } = useAuth();
  const { getCurrentWeekAllowance, deductFromAllowance } = useAttendance();
  const [activeTab, setActiveTab] = useState('requisitions');
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<ExpenseRequest[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(true);
  const [weeklyAllowance, setWeeklyAllowance] = useState<any>(null);

  // Cash Requisition Form State
  const [requisitionForm, setRequisitionForm] = useState({
    title: '',
    amount: '',
    description: ''
  });

  // Personal Expense Form State
  const [personalExpenseForm, setPersonalExpenseForm] = useState({
    title: '',
    expenseType: '',
    amount: '',
    description: ''
  });

  // Salary Request Form State
  const [salaryForm, setSalaryForm] = useState({
    requestType: '',
    amount: '',
    reason: ''
  });

  // Fetch user's requests
  const fetchMyRequests = async () => {
    if (!employee?.email) return;
    
    try {
      setFetchingRequests(true);
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('requestedby', employee.email)
        .in('type', ['Cash Requisition', 'Personal Expense', 'Salary Request'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your requests",
        variant: "destructive"
      });
    } finally {
      setFetchingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [employee?.email]);

  // Fetch weekly allowance when user opens personal expenses tab
  useEffect(() => {
    const fetchAllowance = async () => {
      if (activeTab === 'personal' && user?.id) {
        const allowance = await getCurrentWeekAllowance(user.id);
        setWeeklyAllowance(allowance);
      }
    };
    fetchAllowance();
  }, [activeTab, user?.id]);

  // Submit Cash Requisition
  const handleRequisitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    if (!requisitionForm.title || !requisitionForm.amount || !requisitionForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('approval_requests')
        .insert({
          type: 'Cash Requisition',
          title: requisitionForm.title,
          description: requisitionForm.description,
          amount: parseFloat(requisitionForm.amount),
          requestedby: employee.email,
          requestedby_name: employee.name,
          requestedby_position: employee.position,
          department: employee.department,
          daterequested: new Date().toISOString().split('T')[0],
          priority: 'Medium',
          status: 'Pending',
          approval_stage: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cash requisition submitted successfully"
      });

      setRequisitionForm({ title: '', amount: '', description: '' });
      fetchMyRequests();
    } catch (error) {
      console.error('Error submitting requisition:', error);
      toast({
        title: "Error",
        description: "Failed to submit requisition",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit Personal Expense
  const handlePersonalExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !user) return;

    if (!personalExpenseForm.expenseType || !personalExpenseForm.amount || !personalExpenseForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const requestAmount = parseFloat(personalExpenseForm.amount);

    // Special validation for Weekly Lunch Allowance
    if (personalExpenseForm.expenseType === 'Weekly Lunch Allowance') {
      if (!weeklyAllowance) {
        toast({
          title: "Error",
          description: "Unable to load weekly allowance. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (weeklyAllowance.balance_available < requestAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You have ${weeklyAllowance.balance_available.toLocaleString()} UGX available this week. Your allowance refreshes every Monday.`,
          variant: "destructive"
        });
        return;
      }

      if (requestAmount > 15000) {
        toast({
          title: "Amount Exceeds Limit",
          description: "Weekly lunch allowance is limited to 15,000 UGX per week.",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);
    try {
      // For lunch allowance, deduct from weekly allowance first
      if (personalExpenseForm.expenseType === 'Weekly Lunch Allowance') {
        await deductFromAllowance(user.id, requestAmount);
      }

      const { error } = await supabase
        .from('approval_requests')
        .insert({
          type: 'Personal Expense',
          title: personalExpenseForm.title,
          description: personalExpenseForm.description,
          amount: requestAmount,
          requestedby: employee.email,
          requestedby_name: employee.name,
          requestedby_position: employee.position,
          department: employee.department,
          daterequested: new Date().toISOString().split('T')[0],
          priority: 'Medium',
          status: 'Pending',
          approval_stage: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Personal expense submitted successfully"
      });

      setPersonalExpenseForm({ title: '', expenseType: '', amount: '', description: '' });
      
      // Refresh allowance and requests
      if (personalExpenseForm.expenseType === 'Weekly Lunch Allowance') {
        const updatedAllowance = await getCurrentWeekAllowance(user.id);
        setWeeklyAllowance(updatedAllowance);
      }
      fetchMyRequests();
    } catch (error) {
      console.error('Error submitting expense:', error);
      toast({
        title: "Error",
        description: "Failed to submit expense",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit Salary Request
  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    if (!salaryForm.requestType || !salaryForm.amount || !salaryForm.reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('approval_requests')
        .insert({
          type: 'Salary Request',
          title: `${salaryForm.requestType} Salary Request - ${employee.name}`,
          description: salaryForm.reason,
          amount: parseFloat(salaryForm.amount),
          requestedby: employee.email,
          requestedby_name: employee.name,
          requestedby_position: employee.position,
          department: employee.department,
          daterequested: new Date().toISOString().split('T')[0],
          priority: 'High',
          status: 'Pending',
          approval_stage: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salary request submitted successfully"
      });

      setSalaryForm({ requestType: '', amount: '', reason: '' });
      fetchMyRequests();
    } catch (error) {
      console.error('Error submitting salary request:', error);
      toast({
        title: "Error",
        description: "Failed to submit salary request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getApprovalStatus = (request: ExpenseRequest) => {
    if (request.status === 'Rejected') return 'Rejected';
    if (request.status === 'Approved') return 'Fully Approved';
    
    const financeApproved = !!request.finance_approved_at;
    const adminApproved = !!request.admin_approved_at;
    
    if (financeApproved && adminApproved) return 'Fully Approved';
    if (financeApproved && !adminApproved) return 'Finance Approved - Awaiting Admin';
    if (!financeApproved && adminApproved) return 'Admin Approved - Awaiting Finance';
    return 'Pending Approval';
  };

  const filterRequestsByType = (type: string) => {
    return myRequests.filter(req => req.type === type);
  };

  if (!employee) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view and submit expense requests.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Expenses</h1>
            <p className="text-muted-foreground">Submit and track your expense requests</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requisitions">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cash Requisitions
            </TabsTrigger>
            <TabsTrigger value="personal">
              <Coffee className="h-4 w-4 mr-2" />
              Personal Expenses
            </TabsTrigger>
            <TabsTrigger value="salary">
              <Wallet className="h-4 w-4 mr-2" />
              Salary Requests
            </TabsTrigger>
          </TabsList>

          {/* Cash Requisitions Tab */}
          <TabsContent value="requisitions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Cash Requisition</CardTitle>
                <CardDescription>
                  Request money for company purchases or business needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequisitionSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="req-title">Title</Label>
                    <Input
                      id="req-title"
                      placeholder="e.g., Office Supplies Purchase"
                      value={requisitionForm.title}
                      onChange={(e) => setRequisitionForm({ ...requisitionForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="req-amount">Amount (UGX)</Label>
                    <Input
                      id="req-amount"
                      type="number"
                      placeholder="0.00"
                      value={requisitionForm.amount}
                      onChange={(e) => setRequisitionForm({ ...requisitionForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="req-description">Description</Label>
                    <Textarea
                      id="req-description"
                      placeholder="Explain what you need to purchase and why..."
                      value={requisitionForm.description}
                      onChange={(e) => setRequisitionForm({ ...requisitionForm, description: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Submitting...' : 'Submit Requisition'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Cash Requisitions */}
            <Card>
              <CardHeader>
                <CardTitle>My Cash Requisitions</CardTitle>
              </CardHeader>
              <CardContent>
                {fetchingRequests ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filterRequestsByType('Cash Requisition').length === 0 ? (
                  <p className="text-muted-foreground">No cash requisitions yet</p>
                ) : (
                  <div className="space-y-4">
                    {filterRequestsByType('Cash Requisition').map((request) => (
                      <Card key={request.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{request.title}</h3>
                                {getStatusIcon(request.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{request.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-semibold">UGX {request.amount.toLocaleString()}</span>
                                <span className="text-muted-foreground">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              {getApprovalStatus(request)}
                            </Badge>
                          </div>
                          {request.rejection_reason && (
                            <Alert variant="destructive" className="mt-4">
                              <AlertDescription>
                                <strong>Rejection Reason:</strong> {request.rejection_reason}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personal Expenses Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Personal Expense</CardTitle>
                <CardDescription>
                  Request reimbursement for personal expenses (lunch, airtime, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePersonalExpenseSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="exp-type">Expense Type</Label>
                    <Select 
                      value={personalExpenseForm.expenseType} 
                      onValueChange={(value) => setPersonalExpenseForm({ ...personalExpenseForm, expenseType: value, title: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly Lunch Allowance">
                          🍽️ Weekly Lunch Allowance
                        </SelectItem>
                        <SelectItem value="Airtime">📱 Airtime</SelectItem>
                        <SelectItem value="Transport">🚗 Transport</SelectItem>
                        <SelectItem value="Office Supplies">📋 Office Supplies</SelectItem>
                        <SelectItem value="Other">💼 Other Personal Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {personalExpenseForm.expenseType === 'Weekly Lunch Allowance' && (
                      <>
                        {weeklyAllowance ? (
                          <Alert className="border-green-200 bg-green-50 mt-2">
                            <Coffee className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-xs text-green-800">
                              <div className="space-y-2">
                                <div className="font-semibold">Your Weekly Lunch Allowance</div>
                                <div className="space-y-1">
                                  <div>💰 Weekly Limit: <strong>15,000 UGX</strong></div>
                                  <div>✅ Available to Request: <strong className="text-green-700 text-base">{weeklyAllowance.balance_available?.toLocaleString()} UGX</strong></div>
                                  <div className="text-xs text-green-600">Already requested: {weeklyAllowance.amount_requested?.toLocaleString()} UGX</div>
                                  <div className="text-xs text-green-600 pt-1">⏰ Refreshes every Monday</div>
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert className="border-blue-200 bg-blue-50 mt-2">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs text-blue-800">
                              <div className="space-y-1">
                                <div className="font-semibold">Weekly Lunch Allowance Policy:</div>
                                <ul className="list-disc list-inside space-y-0.5 ml-1">
                                  <li>Fixed allowance: <strong>15,000 UGX per week</strong></li>
                                  <li>Coverage: <strong>Monday to Saturday</strong> (Sunday excluded)</li>
                                  <li>Auto-refreshes every <strong>Monday</strong></li>
                                  <li>Request full amount or in portions throughout the week</li>
                                </ul>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exp-amount">
                      Amount (UGX)
                      {personalExpenseForm.expenseType === 'Weekly Lunch Allowance' && weeklyAllowance && (
                        <span className="text-xs text-muted-foreground ml-2">
                          Max: {weeklyAllowance.balance_available?.toLocaleString()} UGX
                        </span>
                      )}
                    </Label>
                    <Input
                      id="exp-amount"
                      type="number"
                      placeholder="0.00"
                      value={personalExpenseForm.amount}
                      onChange={(e) => setPersonalExpenseForm({ ...personalExpenseForm, amount: e.target.value })}
                      required
                      min="1000"
                      step="1000"
                      max={personalExpenseForm.expenseType === 'Weekly Lunch Allowance' && weeklyAllowance ? weeklyAllowance.balance_available : undefined}
                    />
                    {personalExpenseForm.expenseType === 'Weekly Lunch Allowance' && 
                     weeklyAllowance && 
                     parseFloat(personalExpenseForm.amount) > weeklyAllowance.balance_available && (
                      <p className="text-xs text-destructive">Amount exceeds your available weekly allowance</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exp-description">Description</Label>
                    <Textarea
                      id="exp-description"
                      placeholder="Explain the expense..."
                      value={personalExpenseForm.description}
                      onChange={(e) => setPersonalExpenseForm({ ...personalExpenseForm, description: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={
                      loading || 
                      (personalExpenseForm.expenseType === 'Weekly Lunch Allowance' && 
                       (!weeklyAllowance || parseFloat(personalExpenseForm.amount) > weeklyAllowance.balance_available))
                    }
                    className="w-full"
                  >
                    {loading ? 'Submitting...' : 'Submit Expense'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Personal Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>My Personal Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {fetchingRequests ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filterRequestsByType('Personal Expense').length === 0 ? (
                  <p className="text-muted-foreground">No personal expenses yet</p>
                ) : (
                  <div className="space-y-4">
                    {filterRequestsByType('Personal Expense').map((request) => (
                      <Card key={request.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{request.title}</h3>
                                {getStatusIcon(request.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{request.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-semibold">UGX {request.amount.toLocaleString()}</span>
                                <span className="text-muted-foreground">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              {getApprovalStatus(request)}
                            </Badge>
                          </div>
                          {request.rejection_reason && (
                            <Alert variant="destructive" className="mt-4">
                              <AlertDescription>
                                <strong>Rejection Reason:</strong> {request.rejection_reason}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Requests Tab */}
          <TabsContent value="salary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Salary Request</CardTitle>
                <CardDescription>
                  Request advance payment or salary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSalarySubmit} className="space-y-4">
                  {employee?.salary && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Wallet className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-800">
                        <div className="space-y-1">
                          <div className="font-semibold">Your Monthly Salary: {employee.salary.toLocaleString()} UGX</div>
                          <div className="text-xs">
                            • Mid-Month: {(employee.salary / 2).toLocaleString()} UGX (Half salary)<br/>
                            • End of Month: {employee.salary.toLocaleString()} UGX (Full salary)
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="sal-type">Request Type</Label>
                    <Select 
                      value={salaryForm.requestType} 
                      onValueChange={(value) => {
                        const calculatedAmount = value === 'Mid-Month' 
                          ? (employee?.salary ? employee.salary / 2 : 0)
                          : (employee?.salary ? employee.salary : 0);
                        
                        setSalaryForm({ 
                          ...salaryForm, 
                          requestType: value,
                          amount: calculatedAmount.toString()
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mid-Month">
                          📅 Mid-Month Request (Half Salary)
                        </SelectItem>
                        <SelectItem value="End of Month">
                          💰 End of Month Request (Full Salary)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {salaryForm.requestType && (
                      <Alert className="border-green-200 bg-green-50 mt-2">
                        <AlertCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-xs text-green-800">
                          {salaryForm.requestType === 'Mid-Month' ? (
                            <div>
                              <strong>Mid-Month Request:</strong> You will receive half of your monthly salary ({(employee?.salary ? employee.salary / 2 : 0).toLocaleString()} UGX). 
                              The remaining half will be paid at the end of the month.
                            </div>
                          ) : (
                            <div>
                              <strong>End of Month Request:</strong> You will receive your full monthly salary ({employee?.salary?.toLocaleString()} UGX).
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sal-amount">Amount (UGX)</Label>
                    <Input
                      id="sal-amount"
                      type="number"
                      placeholder="0.00"
                      value={salaryForm.amount}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Amount is automatically calculated based on request type
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sal-reason">Reason</Label>
                    <Textarea
                      id="sal-reason"
                      placeholder="Explain why you need this salary advance..."
                      value={salaryForm.reason}
                      onChange={(e) => setSalaryForm({ ...salaryForm, reason: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Submitting...' : 'Submit Salary Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Salary Requests */}
            <Card>
              <CardHeader>
                <CardTitle>My Salary Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {fetchingRequests ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filterRequestsByType('Salary Request').length === 0 ? (
                  <p className="text-muted-foreground">No salary requests yet</p>
                ) : (
                  <div className="space-y-4">
                    {filterRequestsByType('Salary Request').map((request) => (
                      <Card key={request.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{request.title}</h3>
                                {getStatusIcon(request.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{request.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-semibold">UGX {request.amount.toLocaleString()}</span>
                                <span className="text-muted-foreground">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              {getApprovalStatus(request)}
                            </Badge>
                          </div>
                          {request.rejection_reason && (
                            <Alert variant="destructive" className="mt-4">
                              <AlertDescription>
                                <strong>Rejection Reason:</strong> {request.rejection_reason}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MyExpenses;
