import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PermissionChangeRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  daterequested: string;
  requestedby_name: string;
  details: {
    employee_id: string;
    employee_name: string;
    employee_email: string;
    current_role: string;
    current_permissions: string[];
    requested_role: string;
    requested_permissions: string[];
    justification: string;
  };
}

export function PermissionChangeApprovals() {
  const { employee: currentUser, isAdmin } = useAuth();
  const [requests, setRequests] = useState<PermissionChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PermissionChangeRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (isAdmin()) {
      fetchRequests();
    }
  }, [isAdmin]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'permission_change')
        .eq('status', 'pending')
        .order('daterequested', { ascending: false });

      if (error) throw error;
      
      // Filter and type cast - properly handle Json type
      const permissionRequests: PermissionChangeRequest[] = (data || [])
        .filter((r) => r.details && typeof r.details === 'object' && 'employee_id' in (r.details as object))
        .map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          status: r.status,
          daterequested: r.daterequested,
          requestedby_name: r.requestedby_name || r.requestedby,
          details: r.details as PermissionChangeRequest['details']
        }));
      
      setRequests(permissionRequests);
    } catch (error) {
      console.error('Error fetching permission requests:', error);
      toast.error('Failed to load permission change requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PermissionChangeRequest) => {
    if (!currentUser) return;

    setProcessing(request.id);
    try {
      // Apply the permission changes
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          role: request.details.requested_role,
          permissions: request.details.requested_permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.details.employee_id);

      if (updateError) throw updateError;

      // Update the approval request status
      const { error: approvalError } = await supabase
        .from('approval_requests')
        .update({
          status: 'approved',
          admin_approved: true,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: currentUser.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (approvalError) throw approvalError;

      toast.success(`Permissions updated for ${request.details.employee_name}`);
      fetchRequests();
    } catch (error) {
      console.error('Error approving permission change:', error);
      toast.error('Failed to approve permission change');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !currentUser) return;

    setProcessing(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'rejected',
          admin_approved: false,
          rejection_reason: rejectReason,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: currentUser.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Permission change request rejected');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting permission change:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (request: PermissionChangeRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  if (!isAdmin()) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Change Approvals
            {requests.length > 0 && (
              <Badge variant="destructive">{requests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and approve permission changes requested by IT
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending permission change requests</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id} className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-semibold">{request.details.employee_name}</span>
                              <Badge variant="outline">{request.details.employee_email}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Requested by {request.requestedby_name} on{' '}
                              {new Date(request.daterequested).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-amber-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-3 bg-background rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Current Role</p>
                            <Badge variant="secondary">{request.details.current_role}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Requested Role</p>
                              <Badge className="bg-primary">{request.details.requested_role}</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Justification</p>
                          <p className="text-sm">{request.details.justification}</p>
                        </div>

                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">
                            Requested Permissions ({request.details.requested_permissions?.length || 0})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {request.details.requested_permissions?.slice(0, 10).map((perm, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                            {(request.details.requested_permissions?.length || 0) > 10 && (
                              <Badge variant="outline" className="text-xs">
                                +{request.details.requested_permissions.length - 10} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleApprove(request)}
                            disabled={processing === request.id}
                            className="flex-1"
                          >
                            {processing === request.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve & Apply
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => openRejectDialog(request)}
                            disabled={processing === request.id}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Permission Change</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request. This will be visible to IT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || processing !== null}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
