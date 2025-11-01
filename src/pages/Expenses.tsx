import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApprovalSystem } from '@/hooks/useApprovalSystem';
import { useMyExpenseRequests } from '@/hooks/useMyExpenseRequests';
import { useAttendance } from '@/hooks/useAttendance';
import { useMonthlySalaryTracking } from '@/hooks/useMonthlySalaryTracking';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Send, FileText, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, User, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { RequisitionForm } from '@/components/finance/RequisitionForm';

const Expenses = () => {
  const { employee } = useAuth();
  const { createApprovalRequest, loading: submitting } = useApprovalSystem();
  const { requests: myRequests, loading: fetchingRequests, refetch, getApprovalStatus, getStatusColor, getRejectionDetails } = useMyExpenseRequests();
  const { getCurrentWeekAllowance, deductFromAllowance } = useAttendance();

  const [formData, setFormData] = useState({
    expenseType: '',
    amount: '',
    description: '',
    reason: '',
    phoneNumber: ''
  });

  const [weeklyAllowance, setWeeklyAllowance] = useState<any>(null);
  const [loadingAllowance, setLoadingAllowance] = useState(true);

  const [salaryFormData, setSalaryFormData] = useState({
    amount: '',
    reason: '',
    phoneNumber: '',
    requestType: 'mid-month' as 'mid-month' | 'end-month' | 'emergency' | 'advance'
  });

  const [mySalaryRequests, setMySalaryRequests] = useState<any[]>([]);

  // Use salary tracking hook
  const { periodInfo, loading: loadingSalaryInfo, refetch: refetchSalaryInfo } = useMonthlySalaryTracking(
    employee?.email,
    employee?.salary || 0,
    salaryFormData.requestType
  );

  // Fetch user's weekly allowance
  useEffect(() => {
    const fetchAllowance = async () => {
      if (employee?.id) {
        setLoadingAllowance(true);
        const allowance = await getCurrentWeekAllowance(employee.id);
        setWeeklyAllowance(allowance);
        setLoadingAllowance(false);
      }
    };
    fetchAllowance();
  }, [employee?.id]);

  // Filter to only show user's own expense requests and requisitions
  const myExpenseRequests = myRequests.filter(req => 
    req.type === 'Expense Request' || 
    req.type === 'Requisition' ||
    (req.type && req.type.includes('Expense') && !req.type.includes('Salary'))
  );

  // Fetch salary requests from Supabase money_requests
  useEffect(() => {
    const fetchSalaryRequests = async () => {
      if (!employee?.authUserId) return;
      
      try {
        const { data } = await supabase
          .from('money_requests')
          .select('*')
          .eq('user_id', employee.authUserId)
          .in('request_type', ['Salary Advance', 'Mid-Month Salary', 'End-Month Salary', 'Emergency Salary Request'])
          .order('created_at', { ascending: false });

        setMySalaryRequests(data || []);
      } catch (error) {
        console.error('Error fetching salary requests:', error);
      }
    };

    fetchSalaryRequests();
  }, [employee?.authUserId, submitting]);

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
    
    if (!formData.expenseType || !formData.amount || !formData.description || !formData.reason || !formData.phoneNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount < 2000) {
      toast({
        title: "Error",
        description: "Please enter a valid amount (minimum UGX 2,000)",
        variant: "destructive"
      });
      return;
    }

    // Check meals/refreshments against weekly allowance
    if (formData.expenseType === 'meals') {
      if (!weeklyAllowance) {
        toast({
          title: "No Allowance Available",
          description: "You need to be marked present for at least one day this week to request meals/refreshments. Each day present earns you UGX 2,500.",
          variant: "destructive"
        });
        return;
      }

      if (numericAmount > weeklyAllowance.balance_available) {
        toast({
          title: "Insufficient Allowance Balance",
          description: `You only have UGX ${weeklyAllowance.balance_available.toLocaleString()} available from ${weeklyAllowance.days_attended} days attended this week. You've already requested UGX ${weeklyAllowance.amount_requested.toLocaleString()}.`,
          variant: "destructive"
        });
        return;
      }

      if (numericAmount > 15000) {
        toast({
          title: "Error",
          description: "Meals and Refreshments requests cannot exceed UGX 15,000",
          variant: "destructive"
        });
        return;
      }
    }

    // Check if user has already requested meals in the last 7 days
    if (formData.expenseType === 'meals') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentMealsRequest = myExpenseRequests.find(req => {
        const requestDate = new Date(req.created_at);
        const isMealsRequest = req.details?.expenseType === 'meals' || 
                               req.details?.expenseCategory?.toLowerCase().includes('meals');
        return isMealsRequest && requestDate >= sevenDaysAgo;
      });

      if (recentMealsRequest) {
        const nextAvailableDate = new Date(recentMealsRequest.created_at);
        nextAvailableDate.setDate(nextAvailableDate.getDate() + 7);
        
        toast({
          title: "Error",
          description: `You already requested Meals/Refreshments on ${new Date(recentMealsRequest.created_at).toLocaleDateString()}. You can request again on ${nextAvailableDate.toLocaleDateString()}.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Basic phone number validation
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    const selectedType = expenseTypes.find(type => type.value === formData.expenseType);
    const title = `${selectedType?.label || formData.expenseType} Request - UGX ${numericAmount.toLocaleString()}`;

    const success = await createApprovalRequest(
      'Expense Request',
      title,
      formData.description,
      numericAmount,
      {
        expenseType: formData.expenseType,
        expenseCategory: selectedType?.label || formData.expenseType,
        reason: formData.reason,
        phoneNumber: formData.phoneNumber,
        requestDate: new Date().toISOString(),
        department: employee?.department || 'General',
        priority: 'Normal'
      }
    );

    if (success) {
      // Deduct from weekly allowance for meals/refreshments
      if (formData.expenseType === 'meals' && employee?.id) {
        try {
          await deductFromAllowance(employee.id, numericAmount);
          toast({
            title: "Allowance Deducted",
            description: `UGX ${numericAmount.toLocaleString()} deducted from your weekly allowance. Remaining: UGX ${(weeklyAllowance.balance_available - numericAmount).toLocaleString()}`,
          });
          // Refresh allowance
          const updatedAllowance = await getCurrentWeekAllowance(employee.id);
          setWeeklyAllowance(updatedAllowance);
        } catch (error) {
          console.error('Failed to deduct from allowance:', error);
        }
      }

      // Reset form
      setFormData({
        expenseType: '',
        amount: '',
        description: '',
        reason: '',
        phoneNumber: ''
      });
      
      // Refresh requests
      refetch();
    }
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee?.email || !employee?.authUserId) {
      toast({
        title: "Error",
        description: "Employee information not found",
        variant: "destructive"
      });
      return;
    }

    if (!salaryFormData.amount || !salaryFormData.reason || !salaryFormData.phoneNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(salaryFormData.amount);
    if (isNaN(numericAmount) || numericAmount < 10000) {
      toast({
        title: "Error",
        description: "Please enter a valid amount (minimum UGX 10,000)",
        variant: "destructive"
      });
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(salaryFormData.phoneNumber)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    const requestTypeLabel = salaryFormData.requestType === 'mid-month' 
      ? 'Mid-Month Salary' 
      : salaryFormData.requestType === 'end-month'
      ? 'End-Month Salary'
      : salaryFormData.requestType === 'advance'
      ? 'Salary Advance'
      : 'Emergency Salary Request';

    try {
      // Submit to Supabase money_requests for proper two-tier approval flow
      const { error } = await supabase
        .from('money_requests')
        .insert({
          user_id: employee.authUserId,
          amount: numericAmount,
          reason: salaryFormData.reason,
          request_type: requestTypeLabel,
          requested_by: employee.name,
          status: 'pending',
          approval_stage: 'pending_finance',
          metadata: {
            employee_email: employee.email,
            employee_name: employee.name,
            employee_phone: salaryFormData.phoneNumber,
            employee_department: employee?.department,
            request_period: salaryFormData.requestType,
            month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            is_advance: salaryFormData.requestType === 'advance',
            is_emergency: salaryFormData.requestType === 'emergency',
            base_salary: employee.salary,
            available_before_request: periodInfo.availableAmount,
            overtime_included: periodInfo.overtimeEarned || 0
          }
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salary request submitted to Finance for approval"
      });
      
      // Reset form
      setSalaryFormData({
        amount: '',
        reason: '',
        phoneNumber: '',
        requestType: 'mid-month'
      });
      
      // Refetch salary info
      refetchSalaryInfo();
    } catch (error) {
      console.error('Error submitting salary request:', error);
      toast({
        title: "Error",
        description: "Failed to submit salary request",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout title="Expense & Salary Requests" subtitle="Submit and track your expense and salary requests with dual approval system">
      <div className="space-y-6">

      <Tabs defaultValue="requisition" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requisition">Requisitions</TabsTrigger>
          <TabsTrigger value="expenses">Expense Requests</TabsTrigger>
          <TabsTrigger value="salary">Salary Requests</TabsTrigger>
        </TabsList>

        {/* Requisition Tab */}
        <TabsContent value="requisition" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RequisitionForm />
            
            {/* My Requisitions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  My Requisitions
                </CardTitle>
                <CardDescription>
                  Track the approval status of your submitted requisitions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {fetchingRequests ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading your requests...</p>
                    </div>
                  ) : myExpenseRequests.filter(r => r.type === 'Requisition').length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No requisitions yet</p>
                      <p className="text-xs text-muted-foreground">Submit your first requisition</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myExpenseRequests.filter(r => r.type === 'Requisition').map((request) => (
                        <Card key={request.id} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold">{request.title}</h4>
                                <p className="text-sm text-muted-foreground">{request.description}</p>
                                
                                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>UGX {request.amount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>

                                {/* Approval tracking */}
                                <div className="mt-3 p-2 bg-slate-50 rounded text-xs">
                                  <div className="font-medium mb-1">Approval Progress:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1">
                                      <div className={`h-1.5 w-1.5 rounded-full ${request.finance_approved_at ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className={request.finance_approved_at ? 'text-green-700' : 'text-gray-500'}>
                                        Finance: {request.finance_approved_at ? '✓ Approved' : 'Pending'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div className={`h-1.5 w-1.5 rounded-full ${request.admin_approved_at ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className={request.admin_approved_at ? 'text-green-700' : 'text-gray-500'}>
                                        Admin: {request.admin_approved_at ? '✓ Approved' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                <Badge className={`text-xs ${getStatusColor(request)}`}>
                                  {getApprovalStatus(request)}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expense Requests Tab */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Weekly Allowance Alert */}
          {!loadingAllowance && weeklyAllowance && (
            <Alert className="border-green-200 bg-green-50">
              <Wallet className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-green-800">Weekly Allowance (Meals/Refreshments):</strong>
                    <div className="text-sm text-green-700 mt-1">
                      {weeklyAllowance.days_attended} days attended × UGX 2,500 = UGX {weeklyAllowance.total_eligible_amount.toLocaleString()} total
                      <br />
                      Requested: UGX {weeklyAllowance.amount_requested.toLocaleString()} | 
                      <span className="font-semibold text-green-800"> Available: UGX {weeklyAllowance.balance_available.toLocaleString()}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {new Date(weeklyAllowance.week_start_date).toLocaleDateString()} - {new Date(weeklyAllowance.week_end_date).toLocaleDateString()}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!loadingAllowance && !weeklyAllowance && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>No Allowance Available:</strong> You need to be marked present for at least one day this week to request meals/refreshments. 
                Each day present earns you UGX 2,500 (max UGX 15,000 per week).
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submit New Expense Request */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Submit New Expense Request
                </CardTitle>
                <CardDescription>
                  Request reimbursement for work-related expenses. Requires both Finance and Admin approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="expenseType">Expense Type *</Label>
                    <Select 
                      value={formData.expenseType} 
                      onValueChange={(value) => setFormData({...formData, expenseType: value})}
                    >
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
                    {formData.expenseType === 'meals' && (() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      
                      const recentMealsRequest = myExpenseRequests.find(req => {
                        const requestDate = new Date(req.created_at);
                        const isMealsRequest = req.details?.expenseType === 'meals' || 
                                               req.details?.expenseCategory?.toLowerCase().includes('meals');
                        return isMealsRequest && requestDate >= sevenDaysAgo;
                      });

                      if (recentMealsRequest) {
                        const nextAvailableDate = new Date(recentMealsRequest.created_at);
                        nextAvailableDate.setDate(nextAvailableDate.getDate() + 7);
                        
                        return (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            You requested Meals/Refreshments on {new Date(recentMealsRequest.created_at).toLocaleDateString()}. 
                            Next eligible: {nextAvailableDate.toLocaleDateString()}
                          </div>
                        );
                      }
                      
                      return weeklyAllowance ? (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                          ✅ Available allowance: UGX {weeklyAllowance.balance_available.toLocaleString()} 
                          (from {weeklyAllowance.days_attended} days attended)
                        </div>
                      ) : (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ No allowance available. Attend work to earn daily allowance (UGX 2,500/day).
                        </p>
                      );
                    })()}
                  </div>

                  <div>
                    <Label htmlFor="amount">
                      Amount (UGX) * (Minimum: 2,000
                      {formData.expenseType === 'meals' && weeklyAllowance && `, Maximum: ${Math.min(15000, weeklyAllowance.balance_available).toLocaleString()}`}
                      {formData.expenseType === 'meals' && !weeklyAllowance && ', No allowance available'}
                      )
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder={
                        formData.expenseType === 'meals' && weeklyAllowance 
                          ? `Max: ${Math.min(15000, weeklyAllowance.balance_available).toLocaleString()}` 
                          : formData.expenseType === 'meals' 
                            ? "No allowance" 
                            : "Enter amount (min. 2,000)"
                      }
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      min="2000"
                      max={formData.expenseType === 'meals' && weeklyAllowance ? Math.min(15000, weeklyAllowance.balance_available) : undefined}
                      disabled={formData.expenseType === 'meals' && !weeklyAllowance}
                      step="1000"
                    />
                    {formData.expenseType === 'meals' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Meals and Refreshments are capped at UGX 15,000
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber">Phone Number for Payment * </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Enter phone number (e.g., 0700123456)"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the phone number where you want to receive the money via mobile money
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide details about the expense"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Business Reason *</Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain why this expense is necessary for work"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Expense Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  My Expense Requests
                </CardTitle>
                <CardDescription>
                  Track the approval status of your submitted expense requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-blue-800">{myExpenseRequests.length}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Approved</p>
                    <p className="text-lg font-bold text-green-800">
                      {myExpenseRequests.filter(r => r.status === 'Approved').length}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-600 font-medium">Pending</p>
                    <p className="text-lg font-bold text-yellow-800">
                      {myExpenseRequests.filter(r => r.status !== 'Approved' && r.status !== 'Rejected').length}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 max-h-96 overflow-y-auto mt-4">
                  {fetchingRequests ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading your requests...</p>
                    </div>
                  ) : myExpenseRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No expense requests yet</p>
                      <p className="text-xs text-muted-foreground">Submit your first request above</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myExpenseRequests.map((request) => (
                        <Card key={request.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold">{request.title}</h4>
                                <p className="text-sm text-muted-foreground">{request.description}</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>UGX {request.amount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>{request.priority}</span>
                                  </div>
                                </div>

                                {/* Two-way approval tracking */}
                                <div className="mt-3 p-2 bg-slate-50 rounded text-xs">
                                  <div className="font-medium mb-1">Approval Progress:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1">
                                      <div className={`h-1.5 w-1.5 rounded-full ${request.finance_approved_at ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className={request.finance_approved_at ? 'text-green-700' : 'text-gray-500'}>
                                        Finance: {request.finance_approved_at ? '✓ Approved' : 'Pending'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div className={`h-1.5 w-1.5 rounded-full ${request.admin_approved_at ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className={request.admin_approved_at ? 'text-green-700' : 'text-gray-500'}>
                                        Admin: {request.admin_approved_at ? '✓ Approved' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                <Badge className={`text-xs ${getStatusColor(request)}`}>
                                  {getApprovalStatus(request)}
                                </Badge>
                              </div>
                            </div>
                            {/* Rejection Details */}
                            {(() => {
                              const rejectionDetails = getRejectionDetails(request);
                              return rejectionDetails ? (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm font-medium text-red-700">
                                      Rejected by {rejectionDetails.rejectedBy}
                                    </span>
                                  </div>
                                  <div className="text-sm text-red-600">
                                    <strong>Reason:</strong> {rejectionDetails.reason}
                                  </div>
                                  {rejectionDetails.comments && (
                                    <div className="text-sm text-red-600 mt-1">
                                      <strong>Comments:</strong> {rejectionDetails.comments}
                                    </div>
                                  )}
                                </div>
                              ) : null;
                            })()}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Salary Requests Tab */}
        <TabsContent value="salary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submit New Salary Request */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Submit New Salary Request
                </CardTitle>
                <CardDescription>
                  Request salary advance or payment based on your monthly salary. Requires both Finance and Admin approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Salary Balance Card */}
                <Card className="mb-4 bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Monthly Salary:</span>
                        <span className="text-sm font-bold">UGX {(employee?.salary || 0).toLocaleString()}</span>
                      </div>
                      {(periodInfo.paidLastMonth || 0) > 0 && (
                        <>
                          <div className="flex justify-between items-center text-orange-600">
                            <span className="text-sm font-medium">Paid Last Month:</span>
                            <span className="text-sm font-semibold">- UGX {(periodInfo.paidLastMonth || 0).toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      {(periodInfo.advancesOwed || 0) > 0 && (
                        <div className="flex justify-between items-center text-red-600">
                          <span className="text-sm font-medium">⚠️ Advances Owed:</span>
                          <span className="text-sm font-semibold">- UGX {(periodInfo.advancesOwed || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {(periodInfo.overtimeEarned || 0) > 0 && (
                        <div className="flex justify-between items-center text-green-600">
                          <span className="text-sm font-medium">💰 Overtime Earned:</span>
                          <span className="text-sm font-semibold">+ UGX {(periodInfo.overtimeEarned || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {((periodInfo.paidLastMonth || 0) > 0 || (periodInfo.advancesOwed || 0) > 0 || (periodInfo.overtimeEarned || 0) > 0) && (
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-sm font-medium">Base Available:</span>
                          <span className={`text-sm font-bold ${(periodInfo.baseAvailable || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            UGX {(periodInfo.baseAvailable || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Requested This Month:</span>
                        <span className="text-sm text-muted-foreground">- UGX {periodInfo.alreadyRequested.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Available to Request Now:</span>
                        <span className={`text-sm font-bold ${periodInfo.availableAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {periodInfo.availableAmount >= 0 ? 'UGX ' : '-UGX '}{Math.abs(periodInfo.availableAmount).toLocaleString()}
                        </span>
                      </div>
                      {!periodInfo.canRequest && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-xs">
                            {periodInfo.message}
                          </AlertDescription>
                        </Alert>
                      )}
                      {periodInfo.canRequest && (
                        <Alert className="mt-2">
                          <AlertDescription className="text-xs">
                            {periodInfo.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <form onSubmit={handleSalarySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="requestType">Request Type *</Label>
                    <Select 
                      value={salaryFormData.requestType} 
                      onValueChange={(value: 'mid-month' | 'end-month' | 'emergency' | 'advance') => 
                        setSalaryFormData({...salaryFormData, requestType: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mid-month">Mid-Month (13th-15th only)</SelectItem>
                        <SelectItem value="end-month">End-Month (31st-2nd only)</SelectItem>
                        <SelectItem value="emergency">Emergency (Anytime)</SelectItem>
                        <SelectItem value="advance">💳 Salary Advance (Anytime)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {salaryFormData.requestType === 'advance'
                        ? '⚠️ Salary advance creates a negative balance and will be deducted from your next salary payment'
                        : salaryFormData.requestType === 'emergency' 
                        ? 'Emergency requests can be made anytime but require special approval'
                        : salaryFormData.requestType === 'mid-month'
                        ? 'Available only from 13th-15th each month (up to 50% of salary)'
                        : 'Available only from 31st-2nd each month (remaining balance)'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="salaryAmount">Amount (UGX) *</Label>
                    <Input
                      id="salaryAmount"
                      type="number"
                      placeholder={salaryFormData.requestType === 'advance' 
                        ? 'Enter amount (advances up to monthly salary)' 
                        : `Enter amount (max: ${periodInfo.availableAmount.toLocaleString()})`}
                      value={salaryFormData.amount}
                      onChange={(e) => setSalaryFormData({...salaryFormData, amount: e.target.value})}
                      min="10000"
                      max={salaryFormData.requestType === 'advance' ? employee?.salary : periodInfo.availableAmount}
                      step="1000"
                      disabled={!periodInfo.canRequest}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {salaryFormData.requestType === 'advance' 
                        ? `Advance limit: UGX ${(employee?.salary || 0).toLocaleString()} (will create negative balance)`
                        : `Maximum available: UGX ${periodInfo.availableAmount.toLocaleString()}`}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="salaryPhoneNumber">Phone Number for Payment *</Label>
                    <Input
                      id="salaryPhoneNumber"
                      type="tel"
                      placeholder="Enter phone number (e.g., 0700123456)"
                      value={salaryFormData.phoneNumber}
                      onChange={(e) => setSalaryFormData({...salaryFormData, phoneNumber: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the phone number where you want to receive the salary payment
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="salaryReason">Reason for Request *</Label>
                    <Textarea
                      id="salaryReason"
                      placeholder="Explain why you need this salary advance"
                      value={salaryFormData.reason}
                      onChange={(e) => setSalaryFormData({...salaryFormData, reason: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting || !periodInfo.canRequest || loadingSalaryInfo}>
                    {submitting ? 'Submitting...' : loadingSalaryInfo ? 'Loading Balance...' : 'Submit Salary Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Salary Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  My Salary Requests
                </CardTitle>
                <CardDescription>
                  Track the approval status of your submitted salary requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-purple-800">{mySalaryRequests.length}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Approved</p>
                    <p className="text-lg font-bold text-green-800">
                      {mySalaryRequests.filter(r => r.status === 'Approved').length}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-600 font-medium">Pending</p>
                    <p className="text-lg font-bold text-yellow-800">
                      {mySalaryRequests.filter(r => r.status !== 'Approved' && r.status !== 'Rejected').length}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 max-h-96 overflow-y-auto mt-4">
                  {fetchingRequests ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading your requests...</p>
                    </div>
                  ) : mySalaryRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No salary requests yet</p>
                      <p className="text-xs text-muted-foreground">Submit your first salary request above</p>
                    </div>
                  ) : (
                     <div className="space-y-3">
                      {mySalaryRequests.map((request) => (
                        <Card key={request.id} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold">{request.request_type}</h4>
                                <p className="text-sm text-muted-foreground">{request.reason}</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>UGX {request.amount?.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span className="capitalize">{request.approval_stage?.replace('_', ' ')}</span>
                                  </div>
                                </div>

                                {/* Two-way approval tracking */}
                                <div className="mt-3 p-2 bg-slate-50 rounded text-xs">
                                  <div className="font-medium mb-1">Approval Progress:</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1">
                                      {request.finance_approved_at ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Clock className="h-3 w-3 text-gray-400" />}
                                      <span className={request.finance_approved_at ? 'text-green-700' : 'text-gray-500'}>
                                        Finance: {request.finance_approved_at ? `✓ ${request.finance_approved_by}` : 'Pending'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {request.admin_approved_at ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Clock className="h-3 w-3 text-gray-400" />}
                                      <span className={request.admin_approved_at ? 'text-green-700' : 'text-gray-500'}>
                                        Admin: {request.admin_approved_at ? `✓ ${request.admin_approved_by}` : request.finance_approved_at ? 'Pending' : 'Awaiting Finance'}
                                      </span>
                                    </div>
                                  </div>
                                  {request.payment_slip_number && (
                                    <div className="mt-2 flex items-center gap-1 text-blue-600 font-semibold">
                                      <FileText className="h-3 w-3" />
                                      <span>Payment Slip: {request.payment_slip_number}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                <Badge variant={
                                  request.status === 'approved' ? 'default' :
                                  request.status === 'rejected' ? 'destructive' :
                                  'secondary'
                                }>
                                  {request.status}
                                </Badge>
                              </div>
                            </div>
                            {/* Rejection Details */}
                            {request.status === 'rejected' && request.rejection_reason && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-sm font-medium text-red-700">Request Rejected</span>
                                </div>
                                <div className="text-sm text-red-600">
                                  <strong>Reason:</strong> {request.rejection_reason}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </Layout>
  );
};

 export default Expenses;