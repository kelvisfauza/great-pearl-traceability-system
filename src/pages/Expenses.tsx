import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useApprovalSystem } from '@/hooks/useApprovalSystem';
import { useMyExpenseRequests } from '@/hooks/useMyExpenseRequests';
import { DollarSign, Send, FileText, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, User, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';

const Expenses = () => {
  const { employee } = useAuth();
  const { createApprovalRequest, loading: submitting } = useApprovalSystem();
  const { requests: myRequests, loading: fetchingRequests, refetch, getApprovalStatus, getStatusColor, getRejectionDetails } = useMyExpenseRequests();

  const [formData, setFormData] = useState({
    expenseType: '',
    amount: '',
    description: '',
    reason: '',
    phoneNumber: ''
  });

  const [salaryFormData, setSalaryFormData] = useState({
    amount: '',
    reason: '',
    phoneNumber: '',
    paymentType: 'mid-month' // default to mid-month
  });

  // Filter to only show user's own expense requests
  const myExpenseRequests = myRequests.filter(req => 
    req.type === 'Expense Request' || 
    (req.type && req.type.includes('Expense') && !req.type.includes('Salary'))
  );

  // Filter to show user's salary requests
  const mySalaryRequests = myRequests.filter(req => 
    req.type === 'Employee Salary Request' || req.type === 'Salary Request'
  );

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

    // Check 150k limit
    if (numericAmount > 150000) {
      toast({
        title: "Error",
        description: "Salary request cannot exceed UGX 150,000",
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

    const title = `${salaryFormData.paymentType === 'mid-month' ? 'Mid-Month' : 'Emergency'} Salary Request - UGX ${numericAmount.toLocaleString()}`;

    const success = await createApprovalRequest(
      'Employee Salary Request',
      title,
      `${salaryFormData.paymentType === 'mid-month' ? 'Mid-month' : 'Emergency'} salary request`,
      numericAmount,
      {
        employee_id: employee?.id,
        employee_name: employee?.name,
        employee_email: employee?.email,
        employee_phone: salaryFormData.phoneNumber,
        employee_department: employee?.department,
        employee_position: employee?.position,
        payment_type: salaryFormData.paymentType,
        monthly_salary: employee?.salary || 0,
        requested_amount: numericAmount,
        reason: salaryFormData.reason,
        requires_dual_approval: true,
        finance_approved: false,
        admin_approved: false,
        requestDate: new Date().toISOString(),
        department: 'Finance',
        priority: 'High'
      }
    );

    if (success) {
      // Reset form
      setSalaryFormData({
        amount: '',
        reason: '',
        phoneNumber: '',
        paymentType: 'mid-month'
      });
      
      // Refresh requests
      refetch();
    }
  };

  return (
    <Layout title="Expense & Salary Requests" subtitle="Submit and track your expense and salary requests with dual approval system">
      <div className="space-y-6">

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expense Requests</TabsTrigger>
          <TabsTrigger value="salary">Salary Requests</TabsTrigger>
        </TabsList>

        {/* Expense Requests Tab */}
        <TabsContent value="expenses" className="space-y-6">
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
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (UGX) * (Minimum: 2,000)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount (min. 2,000)"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      min="2000"
                      step="1000"
                    />
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
                                    <span>UGX {parseFloat(request.amount).toLocaleString()}</span>
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
                  Request salary advance or mid-month payment. Maximum UGX 150,000 per request. Requires both Finance and Admin approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSalarySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="paymentType">Payment Type *</Label>
                    <Select 
                      value={salaryFormData.paymentType} 
                      onValueChange={(value) => setSalaryFormData({...salaryFormData, paymentType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mid-month">Mid-Month Salary</SelectItem>
                        <SelectItem value="emergency">Emergency Advance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="salaryAmount">Amount (UGX) * (Max: 150,000)</Label>
                    <Input
                      id="salaryAmount"
                      type="number"
                      placeholder="Enter amount (max. 150,000)"
                      value={salaryFormData.amount}
                      onChange={(e) => setSalaryFormData({...salaryFormData, amount: e.target.value})}
                      min="10000"
                      max="150000"
                      step="1000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum amount is UGX 150,000 per request
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

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Salary Request'}
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
                                <h4 className="font-semibold">{request.title}</h4>
                                <p className="text-sm text-muted-foreground">{request.description}</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>UGX {parseFloat(request.amount).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
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
      </Tabs>
      </div>
    </Layout>
  );
};

 export default Expenses;