import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserRequests } from '@/hooks/useUserRequests';
import { Plus, DollarSign, MessageSquare, AlertTriangle, Calendar, FileText, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const MyRequests = () => {
  const { requests, loading, createRequest } = useUserRequests();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    requestType: '',
    title: '',
    description: '',
    amount: '',
    priority: 'Medium',
    supplierDetails: '',
    expectedDate: '',
    department: '',
    justification: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requestType || !formData.title || !formData.description) {
      return;
    }

    setIsSubmitting(true);
    
    const requestData = {
      requestType: formData.requestType as any,
      title: formData.title,
      description: formData.description,
      priority: formData.priority as any,
      requestedDate: new Date().toISOString().split('T')[0],
      expectedDate: formData.expectedDate,
      department: formData.department,
      justification: formData.justification,
      ...(formData.amount && { amount: parseFloat(formData.amount) }),
      ...(formData.supplierDetails && { 
        supplierDetails: {
          name: formData.supplierDetails,
          contact: '',
          details: formData.supplierDetails
        }
      })
    };

    const success = await createRequest(requestData);
    
    if (success) {
      setFormData({
        requestType: '',
        title: '',
        description: '',
        amount: '',
        priority: 'Medium',
        supplierDetails: '',
        expectedDate: '',
        department: '',
        justification: ''
      });
      setIsCreateDialogOpen(false);
    }
    
    setIsSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'With HR': return 'secondary';
      case 'With Finance': return 'default';
      case 'Awaiting Management Approval': return 'default';
      case 'Completed': return 'default';
      case 'Rejected': return 'destructive';
      case 'Reviewing': return 'secondary';
      case 'Resolved': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'With HR': return <Clock className="h-4 w-4" />;
      case 'With Finance': return <DollarSign className="h-4 w-4" />;
      case 'Awaiting Management Approval': return <Eye className="h-4 w-4" />;
      case 'Completed': return <CheckCircle className="h-4 w-4" />;
      case 'Rejected': return <XCircle className="h-4 w-4" />;
      case 'Reviewing': return <Eye className="h-4 w-4" />;
      case 'Resolved': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'outline';
      case 'Medium': return 'secondary';
      case 'High': return 'default';
      case 'Urgent': return 'destructive';
      default: return 'secondary';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'payment_advance': return <DollarSign className="h-5 w-5" />;
      case 'supplier_motivation': return <FileText className="h-5 w-5" />;
      case 'complaint': return <AlertTriangle className="h-5 w-5" />;
      case 'feedback': return <MessageSquare className="h-5 w-5" />;
      case 'leave_request': return <Calendar className="h-5 w-5" />;
      case 'expense_reimbursement': return <DollarSign className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const formatRequestType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const getRequestsByStatus = () => {
    const grouped = requests.reduce((acc, request) => {
      const status = request.status || 'Pending';
      if (!acc[status]) acc[status] = [];
      acc[status].push(request);
      return acc;
    }, {} as Record<string, any[]>);
    
    return grouped;
  };

  const requestsByStatus = getRequestsByStatus();
  const totalRequests = requests.length;
  const activeRequests = requests.filter(r => 
    !['Completed', 'Resolved', 'Rejected'].includes(r.status) && 
    r.currentStep !== 'completed'
  ).length;
  const completedRequests = requests.filter(r => 
    ['Completed', 'Resolved'].includes(r.status) || r.currentStep === 'completed'
  ).length;
  const rejectedRequests = requestsByStatus['Rejected']?.length || 0;
  
  // Separate active and previous requests - check both status and currentStep
  const activeRequestsList = requests.filter(r => 
    !['Completed', 'Resolved', 'Rejected'].includes(r.status) && 
    r.currentStep !== 'completed'
  );
  const previousRequestsList = requests.filter(r => 
    ['Completed', 'Resolved', 'Rejected'].includes(r.status) || 
    r.currentStep === 'completed'
  );

  if (loading) {
    return (
      <Layout title="My Requests" subtitle="Submit and track your requests to management">
        <div className="flex items-center justify-center py-8">
          <p>Loading your requests...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Requests" subtitle="Submit and track your requests to management">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold">{totalRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold">{activeRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{completedRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold">{rejectedRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Request Management</CardTitle>
              <CardDescription>Submit new requests and track existing ones</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Request</DialogTitle>
                  <DialogDescription>Fill out the form below to submit your request</DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="requestType">Request Type *</Label>
                      <Select value={formData.requestType} onValueChange={(value) => setFormData({...formData, requestType: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment_advance">Payment Advance</SelectItem>
                          <SelectItem value="supplier_motivation">Supplier Motivation</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="leave_request">Leave Request</SelectItem>
                          <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Brief title for your request"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Detailed description of your request"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(formData.requestType === 'payment_advance' || formData.requestType === 'expense_reimbursement') && (
                      <div>
                        <Label htmlFor="amount">Amount (UGX)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          placeholder="Enter amount"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="expectedDate">Expected Date</Label>
                      <Input
                        id="expectedDate"
                        type="date"
                        value={formData.expectedDate}
                        onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="department">Related Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      placeholder="Which department is this related to?"
                    />
                  </div>

                  {formData.requestType === 'supplier_motivation' && (
                    <div>
                      <Label htmlFor="supplierDetails">Supplier Details</Label>
                      <Textarea
                        id="supplierDetails"
                        value={formData.supplierDetails}
                        onChange={(e) => setFormData({...formData, supplierDetails: e.target.value})}
                        placeholder="Supplier name, contact details, and motivation details"
                        rows={2}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="justification">Justification</Label>
                    <Textarea
                      id="justification"
                      value={formData.justification}
                      onChange={(e) => setFormData({...formData, justification: e.target.value})}
                      placeholder="Why is this request necessary? How will it benefit the company?"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests yet</h3>
                <p className="text-gray-600 mb-4">You haven't submitted any requests yet. Click the button above to create your first request.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Requests */}
                {activeRequestsList.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Active Requests</h3>
                    <div className="space-y-4">
                      {activeRequestsList.map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getRequestTypeIcon(request.requestType)}
                                <div>
                                  <h4 className="font-semibold text-lg">{request.title}</h4>
                                  <p className="text-sm text-gray-600">
                                    {formatRequestType(request.requestType)}
                                    {request.amount && ` - UGX ${request.amount.toLocaleString()}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                                  {getStatusIcon(request.status)}
                                  {request.status}
                                </Badge>
                                <Badge variant={getPriorityColor(request.priority)}>
                                  {request.priority}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-3 line-clamp-2">{request.description}</p>
                            
                             {/* Workflow Progress */}
                             {request.requestType !== 'complaint' && (
                               <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                 <p className="text-xs font-medium text-gray-600 mb-2">Progress:</p>
                                 <div className="flex items-center gap-2">
                                   <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                                     request.currentStep === 'hr' ? 'bg-yellow-100 text-yellow-800' : 
                                     ['finance', 'management', 'completed'].includes(request.currentStep) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                   }`}>
                                     HR {['finance', 'management', 'completed'].includes(request.currentStep) ? '✓' : '→'}
                                   </div>
                                   
                                   {/* Show Finance step only for payment-related requests */}
                                   {(request.requestType === 'payment_advance' || request.requestType === 'expense_reimbursement') && (
                                     <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                                       request.currentStep === 'finance' ? 'bg-yellow-100 text-yellow-800' : 
                                       ['management', 'completed'].includes(request.currentStep) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                     }`}>
                                       Finance {['management', 'completed'].includes(request.currentStep) ? '✓' : request.currentStep === 'finance' ? '→' : ''}
                                     </div>
                                   )}
                                   
                                   <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                                     request.currentStep === 'management' ? 'bg-yellow-100 text-yellow-800' : 
                                     request.currentStep === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                   }`}>
                                     Management {request.currentStep === 'completed' ? '✓' : request.currentStep === 'management' ? '→' : ''}
                                   </div>
                                 </div>
                               </div>
                             )}
                            
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <div className="flex gap-4">
                                <span>Submitted: {new Date(request.requestedDate).toLocaleDateString()}</span>
                                {request.reviewedAt && (
                                  <span>Reviewed: {new Date(request.reviewedAt).toLocaleDateString()}</span>
                                )}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewDetails(request)}
                              >
                                View Details
                              </Button>
                            </div>
                            
                            {request.responseMessage && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                <p className="text-sm">
                                  <strong className="text-blue-800">Response:</strong>
                                  <span className="text-blue-700 ml-2">{request.responseMessage}</span>
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Requests */}
                {previousRequestsList.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Previous Requests</h3>
                    <div className="space-y-4">
                      {previousRequestsList.map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow opacity-75">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getRequestTypeIcon(request.requestType)}
                                <div>
                                  <h4 className="font-semibold text-lg">{request.title}</h4>
                                  <p className="text-sm text-gray-600">
                                    {formatRequestType(request.requestType)}
                                    {request.amount && ` - UGX ${request.amount.toLocaleString()}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                                  {getStatusIcon(request.status)}
                                  {request.status}
                                </Badge>
                                <Badge variant={getPriorityColor(request.priority)}>
                                  {request.priority}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-3 line-clamp-2">{request.description}</p>
                            
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <div className="flex gap-4">
                                <span>Submitted: {new Date(request.requestedDate).toLocaleDateString()}</span>
                                {request.reviewedAt && (
                                  <span>Completed: {new Date(request.reviewedAt).toLocaleDateString()}</span>
                                )}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewDetails(request)}
                              >
                                View Details
                              </Button>
                            </div>
                            
                            {request.responseMessage && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                <p className="text-sm">
                                  <strong className="text-blue-800">Final Response:</strong>
                                  <span className="text-blue-700 ml-2">{request.responseMessage}</span>
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedRequest && getRequestTypeIcon(selectedRequest.requestType)}
                Request Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm">{formatRequestType(selectedRequest.requestType)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(selectedRequest.status)} className="flex items-center gap-1">
                        {getStatusIcon(selectedRequest.status)}
                        {selectedRequest.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="text-sm">{selectedRequest.title}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>
                
                {selectedRequest.amount && (
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <p className="text-sm">UGX {selectedRequest.amount.toLocaleString()}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge variant={getPriorityColor(selectedRequest.priority)}>{selectedRequest.priority}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submitted</Label>
                    <p className="text-sm">{new Date(selectedRequest.requestedDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {selectedRequest.responseMessage && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Management Response</Label>
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">{selectedRequest.responseMessage}</p>
                        {selectedRequest.reviewedAt && (
                          <p className="text-xs text-blue-600 mt-1">
                            Reviewed on {new Date(selectedRequest.reviewedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MyRequests;