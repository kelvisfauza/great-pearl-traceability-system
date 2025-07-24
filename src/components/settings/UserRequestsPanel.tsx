import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserRequests } from '@/hooks/useUserRequests';
import { Plus, DollarSign, MessageSquare, AlertTriangle, Calendar, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const UserRequestsPanel = () => {
  const { requests, loading, createRequest } = useUserRequests();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    requestType: '',
    title: '',
    description: '',
    amount: '',
    priority: 'Medium',
    supplierDetails: ''
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
      ...(formData.amount && { amount: parseFloat(formData.amount) }),
      ...(formData.supplierDetails && { supplierDetails: JSON.parse(formData.supplierDetails || '{}') })
    };

    const success = await createRequest(requestData);
    
    if (success) {
      setFormData({
        requestType: '',
        title: '',
        description: '',
        amount: '',
        priority: 'Medium',
        supplierDetails: ''
      });
      setIsCreateDialogOpen(false);
    }
    
    setIsSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'default';
      case 'Under Review': return 'secondary';
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      case 'Completed': return 'default';
      default: return 'default';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'payment_advance': return <DollarSign className="h-4 w-4" />;
      case 'supplier_motivation': return <FileText className="h-4 w-4" />;
      case 'complaint': return <AlertTriangle className="h-4 w-4" />;
      case 'feedback': return <MessageSquare className="h-4 w-4" />;
      case 'leave_request': return <Calendar className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatRequestType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return <div>Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>Submit and track your requests to management</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Request</DialogTitle>
                <DialogDescription>Submit a new request to management</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="requestType">Request Type</Label>
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
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Brief title for your request"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detailed description of your request"
                    rows={3}
                    required
                  />
                </div>

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
            <div className="text-center py-8">
              <p className="text-muted-foreground">No requests submitted yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getRequestTypeIcon(request.requestType)}
                        <h4 className="font-semibold">{request.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        <Badge variant="outline">{request.priority}</Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatRequestType(request.requestType)}
                      {request.amount && ` - UGX ${request.amount.toLocaleString()}`}
                    </p>
                    
                    <p className="text-sm mb-2">{request.description}</p>
                    
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Submitted: {new Date(request.requestedDate).toLocaleDateString()}</span>
                      {request.reviewedAt && (
                        <span>Reviewed: {new Date(request.reviewedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    {request.responseMessage && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <strong>Response:</strong> {request.responseMessage}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRequestsPanel;