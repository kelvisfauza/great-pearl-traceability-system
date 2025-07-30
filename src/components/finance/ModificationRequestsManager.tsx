import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWorkflowTracking } from '@/hooks/useWorkflowTracking';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Clock,
  Eye,
  RefreshCw,
  FileText
} from 'lucide-react';
import { ModificationRequestModal } from '../workflow/ModificationRequestModal';

const ModificationRequestsManager = () => {
  const { 
    modificationRequests, 
    completeModificationRequest, 
    createModificationRequest,
    refetch: refetchWorkflow,
    loading 
  } = useWorkflowTracking();
  
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modificationModalOpen, setModificationModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Get modification requests targeted to Finance department
  const financeModificationRequests = modificationRequests.filter(
    request => request.targetDepartment === 'Finance' && request.status === 'pending'
  );

  const handleCompleteRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await completeModificationRequest(requestId);
      toast({
        title: "Request Completed",
        description: "Modification request has been marked as completed"
      });
    } catch (error) {
      console.error('Error completing request:', error);
      toast({
        title: "Error",
        description: "Failed to complete modification request",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleForwardToQuality = (request: any) => {
    setSelectedRequest(request);
    setModificationModalOpen(true);
  };

  const handleForwardConfirm = async (targetDepartment: string, reason: string, comments?: string) => {
    if (!selectedRequest) return;
    
    setProcessingId(selectedRequest.id);
    try {
      // Complete the current request
      await completeModificationRequest(selectedRequest.id);
      
      // Create new modification request for the target department
      await createModificationRequest({
        originalPaymentId: selectedRequest.originalPaymentId,
        qualityAssessmentId: selectedRequest.qualityAssessmentId,
        batchNumber: selectedRequest.batchNumber,
        requestedBy: 'Finance Manager',
        requestedByDepartment: 'Finance',
        targetDepartment,
        reason,
        comments: comments || `Forwarded from Finance: ${selectedRequest.reason}`,
        status: 'pending'
      });
      
      toast({
        title: "Request Forwarded",
        description: `Request has been forwarded to ${targetDepartment} department`
      });
      
      setModificationModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error forwarding request:', error);
      toast({
        title: "Error",
        description: "Failed to forward modification request",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await refetchWorkflow();
      toast({
        title: "Refreshed",
        description: "Modification requests have been refreshed"
      });
    } catch (error) {
      console.error('Error refreshing:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'payment_rejected':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Payment Rejected</Badge>;
      case 'quality_issues':
        return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Quality Issues</Badge>;
      case 'price_adjustment':
        return <Badge variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />Price Adjustment</Badge>;
      default:
        return <Badge variant="secondary">{reason.replace('_', ' ')}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Modification Requests
              </CardTitle>
              <CardDescription>
                Review and handle modification requests from other departments
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {financeModificationRequests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
              <p className="text-muted-foreground">All modification requests have been processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>From Department</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeModificationRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.batchNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.requestedByDepartment}</Badge>
                    </TableCell>
                    <TableCell>
                      {getReasonBadge(request.reason)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.comments || 'No additional comments'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{request.requestedBy}</div>
                        <div className="text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleForwardToQuality(request)}
                          disabled={processingId === request.id}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Forward
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCompleteRequest(request.id)}
                          disabled={processingId === request.id}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                        {processingId === request.id && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModificationRequestModal
        open={modificationModalOpen}
        onClose={() => {
          setModificationModalOpen(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleForwardConfirm}
        currentDepartment="Finance"
      />
    </>
  );
};

export default ModificationRequestsManager;