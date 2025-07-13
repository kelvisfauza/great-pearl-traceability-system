
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Clock, User, Calendar, DollarSign } from 'lucide-react';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { useToast } from '@/hooks/use-toast';

export const ApprovalRequests = () => {
  const { requests, loading, updateRequestStatus, fetchRequests } = useApprovalRequests();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleApproval = async (id: string, status: 'Approved' | 'Rejected') => {
    setProcessingId(id);
    try {
      const success = await updateRequestStatus(id, status);
      if (success) {
        toast({
          title: `Request ${status}`,
          description: `The approval request has been ${status.toLowerCase()} successfully.`,
          variant: status === 'Approved' ? 'default' : 'destructive'
        });
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: 'Error',
        description: 'Failed to process the approval request.',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = async () => {
    await fetchRequests();
    toast({
      title: "Refreshed",
      description: "Approval requests have been refreshed"
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approval Requests</h2>
          <p className="text-muted-foreground">
            Review and approve pending requests from various departments
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
            <p className="text-muted-foreground">All approval requests have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <CardDescription>{request.description}</CardDescription>
                  </div>
                  <Badge className={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{request.requestedby}</p>
                      <p className="text-xs text-muted-foreground">{request.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{request.daterequested}</p>
                      <p className="text-xs text-muted-foreground">Requested</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">UGX {Number(request.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Amount</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{request.type}</p>
                      <p className="text-xs text-muted-foreground">Type</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleApproval(request.id, 'Approved')}
                    disabled={processingId === request.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleApproval(request.id, 'Rejected')}
                    disabled={processingId === request.id}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  {processingId === request.id && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Processing...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
