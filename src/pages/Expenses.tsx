import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useApprovalSystem } from '@/hooks/useApprovalSystem';
import { useMyExpenseRequests } from '@/hooks/useMyExpenseRequests';
import { DollarSign, Send, FileText, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, User, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Expenses = () => {
  const { employee } = useAuth();
  const { createApprovalRequest, loading: submitting } = useApprovalSystem();
  const { requests: myRequests, loading: fetchingRequests, refetch, getApprovalStatus, getStatusColor, getRejectionDetails } = useMyExpenseRequests();

  const [formData, setFormData] = useState({
    expenseType: '',
    amount: '',
    description: '',
    reason: ''
  });

  // Filter to only show user's own expense requests
  const myExpenseRequests = myRequests;

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
    
    if (!formData.expenseType || !formData.amount || !formData.description || !formData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
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
        reason: ''
      });
      
      // Refresh requests
      refetch();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Expense Requests</h1>
          <p className="text-muted-foreground">Submit and track your expense requests with dual approval system</p>
        </div>
      </div>

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
                <Label htmlFor="amount">Amount (UGX) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  min="1"
                  step="1000"
                />
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

        {/* My Requests with Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Expense Requests
            </CardTitle>
            <CardDescription>
              Track the approval status of your submitted requests
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
     </div>
   );
 };

 export default Expenses;