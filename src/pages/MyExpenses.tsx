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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, ShoppingCart, Coffee, Wallet, Clock, CheckCircle, XCircle, AlertTriangle, AlertCircle, Printer, Edit2, Undo2, ShieldCheck, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useAttendance } from '@/hooks/useAttendance';
import { useSalaryAdvances, SalaryAdvance } from '@/hooks/useSalaryAdvances';
import Layout from '@/components/Layout';
import PaymentVoucher from '@/components/expenses/PaymentVoucher';
import SalaryAdvanceDeduction from '@/components/expenses/SalaryAdvanceDeduction';
import SalaryAdvanceReceipt from '@/components/expenses/SalaryAdvanceReceipt';
import ApprovalProgressTracker from '@/components/expenses/ApprovalProgressTracker';
import MySalaryPayments from '@/components/expenses/MySalaryPayments';
import ExpenseTemplateDownload from '@/components/expenses/ExpenseTemplateDownload';

interface ExpenseRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  finance_approved_at?: string | null;
  finance_approved_by?: string | null;
  admin_approved_at?: string | null;
  admin_approved_by?: string | null;
  admin_approved_1_at?: string | null;
  admin_approved_1_by?: string | null;
  admin_approved_2_at?: string | null;
  admin_approved_2_by?: string | null;
  requires_three_approvals?: boolean | null;
  rejection_reason?: string | null;
  requestedby_name?: string;
  department?: string;
}

const MyExpenses = () => {
  const { employee, user } = useAuth();
  const { getCurrentWeekAllowance, deductFromAllowance } = useAttendance();
  const { fetchEmployeeAdvance, createAdvancePayment } = useSalaryAdvances();
  const [activeTab, setActiveTab] = useState('requisitions');
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<ExpenseRequest[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(true);
  const [weeklyAllowance, setWeeklyAllowance] = useState<any>(null);
  const [selectedVoucherRequest, setSelectedVoucherRequest] = useState<ExpenseRequest | null>(null);
  const [employeeAdvance, setEmployeeAdvance] = useState<SalaryAdvance | null>(null);
  const [advanceDeduction, setAdvanceDeduction] = useState('');
  const [showAdvanceReceipt, setShowAdvanceReceipt] = useState(false);
  const [advanceReceiptDetails, setAdvanceReceiptDetails] = useState<any>(null);
  const [timeDeduction, setTimeDeduction] = useState<{ hours_missed: number; total_deduction: number; reason: string | null } | null>(null);
  const [editingRequest, setEditingRequest] = useState<ExpenseRequest | null>(null);
  const [editForm, setEditForm] = useState({ title: '', amount: '', description: '' });
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const isFullyApproved = (request: ExpenseRequest) => {
    return request.status === 'Approved' || 
      (!!request.finance_approved_at && !!request.admin_approved_at);
  };

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

  // Fetch employee's active salary advance when opening salary tab
  useEffect(() => {
    const fetchAdvance = async () => {
      if (activeTab === 'salary' && employee?.email) {
        const advance = await fetchEmployeeAdvance(employee.email);
        setEmployeeAdvance(advance);
        if (advance) {
          // Set default deduction to minimum payment
          setAdvanceDeduction(advance.minimum_payment.toString());
        }
      }
    };
    fetchAdvance();
  }, [activeTab, employee?.email, fetchEmployeeAdvance]);

  // Fetch current month time deductions
  useEffect(() => {
    const fetchTimeDeduction = async () => {
      if (activeTab === 'salary' && employee?.id) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { data } = await supabase
          .from('time_deductions')
          .select('hours_missed, total_deduction, reason')
          .eq('employee_id', employee.id)
          .eq('month', currentMonth)
          .maybeSingle();
        setTimeDeduction(data as any);
      }
    };
    fetchTimeDeduction();
  }, [activeTab, employee?.id]);

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
           status: 'Pending Admin',
           approval_stage: 'pending_admin',
          requires_three_approvals: parseFloat(requisitionForm.amount) > 50000
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

    // Special validation for Food Allowance - 3,000 UGX per day
    if (personalExpenseForm.expenseType === 'Food Allowance') {
      if (requestAmount > 3000) {
        toast({
          title: "Amount Exceeds Limit",
          description: "Food allowance is limited to 3,000 UGX per day.",
          variant: "destructive"
        });
        return;
      }
    }

    // Validation for Airtime requests - max 20,000 UGX
    if (personalExpenseForm.expenseType === 'Airtime') {
      if (requestAmount > 20000) {
        toast({
          title: "Amount Exceeds Limit",
          description: "Airtime requests are limited to 20,000 UGX maximum.",
          variant: "destructive"
        });
        return;
      }
    }

    // Validation for Data requests - max 50,000 UGX
    if (personalExpenseForm.expenseType === 'Data') {
      if (requestAmount > 50000) {
        toast({
          title: "Amount Exceeds Limit",
          description: "Data requests are limited to 50,000 UGX maximum.",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);
    try {
      // Food allowance no longer uses weekly deduction

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
           status: 'Pending Admin',
           approval_stage: 'pending_admin',
          requires_three_approvals: requestAmount > 50000
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Personal expense submitted successfully"
      });

      setPersonalExpenseForm({ title: '', expenseType: '', amount: '', description: '' });
      
      // Refresh requests
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

    // Validate advance deduction if employee has an active advance
    const deduction = parseFloat(advanceDeduction) || 0;
    if (employeeAdvance) {
      if (deduction < employeeAdvance.minimum_payment) {
        toast({
          title: "Invalid Deduction",
          description: `Minimum payment towards your advance is ${employeeAdvance.minimum_payment.toLocaleString()} UGX`,
          variant: "destructive"
        });
        return;
      }
      if (deduction > parseFloat(salaryForm.amount)) {
        toast({
          title: "Invalid Deduction",
          description: "Deduction cannot exceed your salary amount",
          variant: "destructive"
        });
        return;
      }
      if (deduction > employeeAdvance.remaining_balance) {
        toast({
          title: "Invalid Deduction",
          description: `Deduction cannot exceed remaining balance (${employeeAdvance.remaining_balance.toLocaleString()} UGX)`,
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);
    try {
      const salaryAmount = parseFloat(salaryForm.amount);
      const netAmount = employeeAdvance ? salaryAmount - deduction : salaryAmount;

      // Create the salary request with advance deduction info in description
      let requestDescription = salaryForm.reason;
      if (employeeAdvance && deduction > 0) {
        requestDescription += `\n\n--- ADVANCE DEDUCTION ---\nGross Salary: ${salaryAmount.toLocaleString()} UGX\nAdvance Payment: ${deduction.toLocaleString()} UGX\nNet Salary: ${netAmount.toLocaleString()} UGX\nRemaining Advance Balance: ${(employeeAdvance.remaining_balance - deduction).toLocaleString()} UGX`;
      }

      const { data: requestData, error } = await supabase
        .from('approval_requests')
        .insert({
          type: 'Salary Request',
          title: `${salaryForm.requestType} Salary Request - ${employee.name}${employeeAdvance ? ' (With Advance Deduction)' : ''}`,
          description: requestDescription,
          amount: netAmount, // Store net amount after deduction
          requestedby: employee.email,
          requestedby_name: employee.name,
          requestedby_position: employee.position,
          department: employee.department,
          daterequested: new Date().toISOString().split('T')[0],
          priority: 'High',
           status: 'Pending Admin',
           approval_stage: 'pending_admin',
          requires_three_approvals: netAmount > 50000,
          details: employeeAdvance ? JSON.stringify({
            gross_salary: salaryAmount,
            advance_deduction: deduction,
            net_salary: netAmount,
            advance_id: employeeAdvance.id,
            advance_remaining_before: employeeAdvance.remaining_balance,
            advance_remaining_after: employeeAdvance.remaining_balance - deduction
          }) : null
        })
        .select()
        .single();

      if (error) throw error;

      // Create advance payment record if applicable
      if (employeeAdvance && deduction > 0 && requestData) {
        await createAdvancePayment(
          employeeAdvance.id,
          employee.email,
          deduction,
          requestData.id
        );
      }

      toast({
        title: "Success",
        description: employeeAdvance 
          ? `Salary request submitted with ${deduction.toLocaleString()} UGX advance deduction`
          : "Salary request submitted successfully"
      });

      setSalaryForm({ requestType: '', amount: '', reason: '' });
      setAdvanceDeduction('');
      fetchMyRequests();
      
      // Refresh advance data
      if (employee.email) {
        const updatedAdvance = await fetchEmployeeAdvance(employee.email);
        setEmployeeAdvance(updatedAdvance);
      }
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
      case 'withdrawn':
        return <Undo2 className="h-4 w-4 text-muted-foreground" />;
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
      case 'withdrawn':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getApprovalStatus = (request: ExpenseRequest) => {
    if (request.status === 'Rejected') return 'Rejected';
    if (request.status === 'Withdrawn') return 'Withdrawn';
    if (request.status === 'Approved') return 'Fully Approved';
    
    if (request.requires_three_approvals) {
      const count = [request.admin_approved_1_at, request.admin_approved_2_at, request.finance_approved_at].filter(Boolean).length;
      if (count === 3) return 'Fully Approved';
      if (count > 0) return `${count}/3 Approvals`;
      return 'Pending - 3 Approvals Required';
    }
    
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

  const canModifyOrWithdraw = (request: ExpenseRequest) => {
    return !request.finance_approved_at && 
           !request.admin_approved_at && 
           request.status !== 'Rejected' && 
           request.status !== 'Approved' && 
           request.status !== 'Withdrawn';
  };

  const handleWithdraw = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({ status: 'Withdrawn' })
        .eq('id', requestId);
      if (error) throw error;
      toast({ title: "Request Withdrawn", description: "Your request has been withdrawn successfully" });
      setWithdrawingId(null);
      fetchMyRequests();
    } catch (error) {
      console.error('Error withdrawing request:', error);
      toast({ title: "Error", description: "Failed to withdraw request", variant: "destructive" });
    }
  };

  const handleStartEdit = (request: ExpenseRequest) => {
    setEditForm({
      title: request.title,
      amount: request.amount.toString(),
      description: request.description
    });
    setEditingRequest(request);
  };

  const handleModifySubmit = async () => {
    if (!editingRequest) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          title: editForm.title,
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          status: 'Pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRequest.id);
      if (error) throw error;
      toast({ title: "Request Updated", description: "Your request has been updated and resubmitted for approval" });
      setEditingRequest(null);
      fetchMyRequests();
    } catch (error) {
      console.error('Error modifying request:', error);
      toast({ title: "Error", description: "Failed to update request", variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">
              <Download className="h-4 w-4 mr-2" />
              Download Forms
            </TabsTrigger>
            <TabsTrigger value="requisitions">
              <ShoppingCart className="h-4 w-4 mr-2" />
              My Requisitions
            </TabsTrigger>
            <TabsTrigger value="personal">
              <Coffee className="h-4 w-4 mr-2" />
              My Expenses
            </TabsTrigger>
            <TabsTrigger value="salary">
              <Wallet className="h-4 w-4 mr-2" />
              Salary
            </TabsTrigger>
          </TabsList>

          {/* Download Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <ExpenseTemplateDownload />
          </TabsContent>

          {/* Cash Requisitions Tab */}
          <TabsContent value="requisitions" className="space-y-6">
            {/* My Cash Requisitions */}
            <Card>
              <CardHeader>
                <CardTitle>My Cash Requisitions</CardTitle>
                <CardDescription>History of your submitted cash requisition forms</CardDescription>
              </CardHeader>
              <CardContent>
                {fetchingRequests ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filterRequestsByType('Cash Requisition').length === 0 ? (
                  <p className="text-muted-foreground">No cash requisitions yet. Download a template from the "Download Forms" tab to get started.</p>
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
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={getStatusColor(request.status)}>
                                {getApprovalStatus(request)}
                              </Badge>
                              {isFullyApproved(request) && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="gap-1 text-xs"
                                  onClick={() => setSelectedVoucherRequest(request)}
                                >
                                  <Printer className="h-3 w-3" />
                                  Print Voucher
                                </Button>
                              )}
                              {canModifyOrWithdraw(request) && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleStartEdit(request)}>
                                    <Edit2 className="h-3 w-3" /> Modify
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setWithdrawingId(request.id)}>
                                    <Undo2 className="h-3 w-3" /> Withdraw
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <ApprovalProgressTracker
                            requiresThreeApprovals={!!request.requires_three_approvals}
                            financeApprovedAt={request.finance_approved_at}
                            financeReviewAt={(request as any).finance_review_at}
                            financeReviewBy={(request as any).finance_review_by}
                            adminApprovedAt={request.admin_approved_at}
                            adminFinalApprovalAt={(request as any).admin_final_approval_at}
                            adminFinalApprovalBy={(request as any).admin_final_approval_by}
                            adminApproved1At={request.admin_approved_1_at}
                            adminApproved1By={request.admin_approved_1_by}
                            adminApproved2At={request.admin_approved_2_at}
                            adminApproved2By={request.admin_approved_2_by}
                            status={request.status}
                          />
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
                <CardTitle>My Personal Expenses</CardTitle>
                <CardDescription>History of your submitted personal expense forms</CardDescription>
              </CardHeader>
              <CardContent>
                {fetchingRequests ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filterRequestsByType('Personal Expense').length === 0 ? (
                  <p className="text-muted-foreground">No personal expenses yet. Download a template from the "Download Forms" tab to get started.</p>
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
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={getStatusColor(request.status)}>
                                {getApprovalStatus(request)}
                              </Badge>
                              {isFullyApproved(request) && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="gap-1 text-xs"
                                  onClick={() => setSelectedVoucherRequest(request)}
                                >
                                  <Printer className="h-3 w-3" />
                                  Print Voucher
                                </Button>
                              )}
                              {canModifyOrWithdraw(request) && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleStartEdit(request)}>
                                    <Edit2 className="h-3 w-3" /> Modify
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setWithdrawingId(request.id)}>
                                    <Undo2 className="h-3 w-3" /> Withdraw
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <ApprovalProgressTracker
                            requiresThreeApprovals={!!request.requires_three_approvals}
                            financeApprovedAt={request.finance_approved_at}
                            financeReviewAt={(request as any).finance_review_at}
                            financeReviewBy={(request as any).finance_review_by}
                            adminApprovedAt={request.admin_approved_at}
                            adminFinalApprovalAt={(request as any).admin_final_approval_at}
                            adminFinalApprovalBy={(request as any).admin_final_approval_by}
                            adminApproved1At={request.admin_approved_1_at}
                            adminApproved1By={request.admin_approved_1_by}
                            adminApproved2At={request.admin_approved_2_at}
                            adminApproved2By={request.admin_approved_2_by}
                            status={request.status}
                          />
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

          {/* Salary Payments Tab */}
          <TabsContent value="salary" className="space-y-6">
            <MySalaryPayments />
          </TabsContent>
        </Tabs>

        {/* Payment Voucher Dialog */}
        {selectedVoucherRequest && (
          <PaymentVoucher
            isOpen={!!selectedVoucherRequest}
            onClose={() => setSelectedVoucherRequest(null)}
            request={selectedVoucherRequest}
            employeeName={employee?.name || ''}
            employeeDepartment={employee?.department || ''}
          />
        )}

        {/* Salary Advance Receipt Dialog */}
        {showAdvanceReceipt && employeeAdvance && (
          <SalaryAdvanceReceipt
            isOpen={showAdvanceReceipt}
            onClose={() => setShowAdvanceReceipt(false)}
            advance={employeeAdvance}
            requestDetails={advanceReceiptDetails}
            employeeName={employee?.name || ''}
            employeeDepartment={employee?.department || ''}
            employeePosition={employee?.position}
          />
        )}

        {/* Withdraw Confirmation Dialog */}
        <Dialog open={!!withdrawingId} onOpenChange={() => setWithdrawingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to withdraw this request? It will be removed from the approvers' queue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawingId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => withdrawingId && handleWithdraw(withdrawingId)}>
                Withdraw Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modify Request Dialog */}
        <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modify Request</DialogTitle>
              <DialogDescription>
                Update your request details. It will be resubmitted for approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancel</Button>
              <Button onClick={handleModifySubmit} disabled={editLoading}>
                {editLoading ? 'Updating...' : 'Update & Resubmit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MyExpenses;
