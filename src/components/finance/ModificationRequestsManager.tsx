import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWorkflowTracking } from '@/hooks/useWorkflowTracking';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  const { employee } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modificationModalOpen, setModificationModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Get modification requests targeted to Finance department
  const financeModificationRequests = modificationRequests.filter(
    request => request.targetDepartment === 'Finance' && request.status === 'pending'
  );

  const handleCompleteAndSubmitToManager = async (request: any) => {
    setProcessingId(request.id);
    try {
      // Complete the modification request
      await updateDoc(doc(db, 'modification_requests', request.id), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: employee?.name || 'Finance'
      });

      // Create a new approval request for the manager
      const approvalRequestData = {
        department: 'Finance',
        type: 'Modification Request Approval',
        title: `Modification Request - ${request.batchNumber || 'Payment'} Ready for Approval`,
        description: `Modification request has been processed by Finance department. Original reason: ${request.reason}. Ready for manager approval and payment processing.`,
        amount: 'Amount to be determined',
        requestedby: employee?.name || 'Finance',
        daterequested: new Date().toISOString().split('T')[0],
        priority: 'Medium',
        status: 'Pending',
        details: {
          paymentId: request.originalPaymentId,
          qualityAssessmentId: request.qualityAssessmentId,
          batchNumber: request.batchNumber,
          originalModificationId: request.id,
          modificationReason: request.reason,
          financeNotes: 'Modification processed by Finance, ready for approval'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'approval_requests'), approvalRequestData);

      toast({
        title: "Request Submitted to Manager",
        description: "Modification has been completed and submitted to manager for approval",
      });

      refetchWorkflow();
    } catch (error) {
      console.error('Error completing and submitting request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request to manager",
        variant: "destructive",
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
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <AlertTriangle className="h-7 w-7 text-orange-500" />
                Pending Approval Requests
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Review and approve requests from various departments
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="lg" className="text-lg px-6">
              <RefreshCw className="h-5 w-5 mr-3" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {financeModificationRequests.length === 0 ? (
            <div className="text-center py-16 px-8">
              <div className="max-w-md mx-auto">
                <CheckCircle2 className="h-24 w-24 text-green-500 mx-auto mb-8" />
                <h3 className="text-3xl font-bold mb-4 text-foreground">No Pending Requests</h3>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  All approval requests have been processed.
                </p>
                <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-lg font-medium text-green-800 mb-2">Great Job! 🎉</p>
                  <p className="text-green-700">
                    You're all caught up with approval requests. Check back later for new submissions.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-6 w-6 text-amber-600" />
                  <h4 className="text-xl font-semibold text-amber-800">
                    {financeModificationRequests.length} Request{financeModificationRequests.length !== 1 ? 's' : ''} Awaiting Review
                  </h4>
                </div>
                <p className="text-amber-700">
                  These requests require your immediate attention for processing and approval.
                </p>
              </div>
              
              <Table className="text-lg">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-lg font-semibold">Batch Number</TableHead>
                    <TableHead className="text-lg font-semibold">From Department</TableHead>
                    <TableHead className="text-lg font-semibold">Reason</TableHead>
                    <TableHead className="text-lg font-semibold">Comments</TableHead>
                    <TableHead className="text-lg font-semibold">Requested</TableHead>
                    <TableHead className="text-lg font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeModificationRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-lg py-4">
                        {request.batchNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-sm px-3 py-1">{request.requestedByDepartment}</Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        {getReasonBadge(request.reason)}
                      </TableCell>
                      <TableCell className="max-w-xs py-4">
                        <div className="text-base">
                          {request.comments || 'No additional comments'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-base">
                          <div className="font-semibold">{request.requestedBy}</div>
                          <div className="text-muted-foreground text-sm">
                            {formatDate(request.createdAt)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleForwardToQuality(request)}
                            disabled={processingId === request.id}
                            className="text-base px-4"
                          >
                            <Send className="h-5 w-5 mr-2" />
                            Forward
                          </Button>
                          <Button
                            variant="default"
                            size="lg"
                            onClick={() => handleCompleteAndSubmitToManager(request)}
                            disabled={processingId === request.id}
                            className="text-base px-4 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Complete & Submit
                          </Button>
                          {processingId === request.id && (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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