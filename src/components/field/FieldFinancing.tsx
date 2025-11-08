import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { DollarSign, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const FieldFinancing = () => {
  const { facilitationRequests, requestFacilitation, loading } = useFieldOperationsData();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    request_type: 'Coffee Purchase Advance',
    amount_requested: '',
    purpose: '',
    date_needed: format(new Date(), 'yyyy-MM-dd'),
    evidence_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount_requested || !formData.purpose) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    await requestFacilitation({
      ...formData,
      amount_requested: parseFloat(formData.amount_requested),
      requested_by: 'current_user' // This should be replaced with actual user context
    });

    setFormData({
      request_type: 'Coffee Purchase Advance',
      amount_requested: '',
      purpose: '',
      date_needed: format(new Date(), 'yyyy-MM-dd'),
      evidence_url: ''
    });
    setShowForm(false);
  };

  const getStatusBadge = (request: any) => {
    if (request.status === 'Approved') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (request.status === 'Rejected') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    
    // Show approval stages for pending requests
    if (request.finance_approved && !request.admin_approved) {
      return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Awaiting Admin</Badge>;
    }
    if (!request.finance_approved) {
      return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Awaiting Finance</Badge>;
    }
    
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const getApprovalDetails = (request: any) => {
    const approvals = [];
    if (request.finance_approved_by) {
      approvals.push(`Finance: ${request.finance_approved_by}`);
    }
    if (request.admin_approved_by) {
      approvals.push(`Admin: ${request.admin_approved_by}`);
    }
    return approvals.length > 0 ? approvals.join(', ') : '-';
  };

  const approvedFinancing = facilitationRequests.filter(r => r.status === 'Approved');
  const totalApproved = approvedFinancing.reduce((sum, r) => sum + r.amount, 0);
  const pendingRequests = facilitationRequests.filter(r => r.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalApproved.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {approvedFinancing.length} approved requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowForm(!showForm)} 
              className="w-full"
              variant={showForm ? "outline" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? 'Cancel' : 'New Request'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Request Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Financing Request</CardTitle>
            <CardDescription>Submit a request for field financing or advances</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Coffee Purchase Advance">Coffee Purchase Advance</SelectItem>
                      <SelectItem value="Transport/Fuel">Transport/Fuel</SelectItem>
                      <SelectItem value="Farmer Advance">Farmer Advance</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Other Operational">Other Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount Requested (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.amount_requested}
                    onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date Needed</Label>
                  <Input
                    type="date"
                    value={formData.date_needed}
                    onChange={(e) => setFormData({ ...formData, date_needed: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Evidence URL (Optional)</Label>
                  <Input
                    type="url"
                    value={formData.evidence_url}
                    onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Purpose / Justification</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Explain why this financing is needed..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Requests History */}
      <Card>
        <CardHeader>
          <CardTitle>Financing Requests History</CardTitle>
          <CardDescription>All submitted financing and facilitation requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approvals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilitationRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No financing requests yet
                  </TableCell>
                </TableRow>
              ) : (
                facilitationRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{format(new Date(request.daterequested || request.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">
                      {request.details?.request_type || 'Field Financing'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                    <TableCell>UGX {request.amount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(request)}</TableCell>
                    <TableCell className="text-xs">{getApprovalDetails(request)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
