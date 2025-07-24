
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Eye, Users, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface RegistrationRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  permissions: string[];
  created_at: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

const UserRegistrationRequests = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();
  const { employee, canManageEmployees } = useAuth();

  // Available permissions based on departments
  const availablePermissions = [
    'Human Resources',
    'Finance',
    'Procurement',
    'Quality Control',
    'Processing',
    'Inventory',
    'Store Management',
    'Sales',
    'Field Operations',
    'Reports',
    'Data Analysis'
  ];

  const fetchRequests = async () => {
    try {
      const requestsQuery = query(
        collection(db, 'user_registration_requests'),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(requestsQuery);
      
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RegistrationRequest[];
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch registration requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageEmployees()) {
      fetchRequests();
    }
  }, [canManageEmployees]);

  const handleApprove = async (request: RegistrationRequest) => {
    if (!employee) return;
    
    setProcessing(request.id);
    
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, request.email, tempPassword);
      
      // Create employee record
      await addDoc(collection(db, 'employees'), {
        name: `${request.firstName} ${request.lastName}`,
        email: request.email.toLowerCase().trim(),
        phone: request.phone,
        position: request.role,
        department: request.department,
        salary: 0,
        role: request.role,
        permissions: tempPermissions,
        status: 'Active',
        join_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        authUserId: userCredential.user.uid,
        isOneTimePassword: true,
        mustChangePassword: true
      });

      // Update request status
      await updateDoc(doc(db, 'user_registration_requests', request.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: employee.name,
        permissions: tempPermissions,
        tempPassword: tempPassword // Store temporarily for notification
      });

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === request.id 
          ? { ...req, status: 'approved', approvedBy: employee.name, permissions: tempPermissions }
          : req
      ));

      toast({
        title: "Request Approved",
        description: `User ${request.firstName} ${request.lastName} has been approved and account created.`
      });

      setShowPermissionsDialog(false);
      setSelectedRequest(null);
      setTempPermissions([]);

    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: RegistrationRequest) => {
    if (!employee || !rejectionReason.trim()) return;
    
    setProcessing(request.id);
    
    try {
      await updateDoc(doc(db, 'user_registration_requests', request.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: employee.name,
        rejectionReason: rejectionReason.trim()
      });

      setRequests(prev => prev.map(req => 
        req.id === request.id 
          ? { ...req, status: 'rejected', rejectedBy: employee.name, rejectionReason: rejectionReason.trim() }
          : req
      ));

      toast({
        title: "Request Rejected",
        description: `Request from ${request.firstName} ${request.lastName} has been rejected.`
      });

      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const openPermissionsDialog = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    // Set default permissions based on department
    const defaultPermissions = [request.department];
    setTempPermissions(defaultPermissions);
    setShowPermissionsDialog(true);
  };

  const togglePermission = (permission: string) => {
    setTempPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (!canManageEmployees()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-600">You don't have permission to manage user registration requests.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Registration Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No registration requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{request.firstName} {request.lastName}</h4>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <div><strong>Email:</strong> {request.email}</div>
                        <div><strong>Phone:</strong> {request.phone}</div>
                        <div><strong>Department:</strong> {request.department}</div>
                        <div><strong>Role:</strong> {request.role}</div>
                        <div><strong>Requested:</strong> {new Date(request.requestedAt).toLocaleDateString()}</div>
                        {request.reason && (
                          <div className="col-span-2"><strong>Reason:</strong> {request.reason}</div>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPermissionsDialog(request)}
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={processing === request.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                                <Textarea
                                  id="rejectionReason"
                                  placeholder="Please provide a reason for rejection..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="destructive"
                                  onClick={() => handleReject(request)}
                                  disabled={!rejectionReason.trim() || processing === request.id}
                                >
                                  {processing === request.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Reject Request
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Permissions</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>User:</strong> {selectedRequest.firstName} {selectedRequest.lastName}</p>
                <p><strong>Department:</strong> {selectedRequest.department}</p>
                <p><strong>Role:</strong> {selectedRequest.role}</p>
              </div>
              
              <div>
                <Label>Select Permissions:</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={tempPermissions.includes(permission)}
                        onCheckedChange={() => togglePermission(permission)}
                      />
                      <Label htmlFor={permission} className="text-sm">{permission}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processing === selectedRequest.id}
                >
                  {processing === selectedRequest.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Approve with Permissions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPermissionsDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRegistrationRequests;
