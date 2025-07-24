
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Clock, UserPlus, Printer, Trash2 } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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
}

interface ModifiedRequest extends RegistrationRequest {
  modifiedDepartment?: string;
  modifiedRole?: string;
  modifiedSalary?: number;
  modifiedPermissions?: string[];
}

const RegistrationRequestsManager = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ModifiedRequest | null>(null);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();
  const { employee, canManageEmployees } = useAuth();

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

  const departments = [
    'Human Resources',
    'Finance',
    'Procurement',
    'Quality Control',
    'Processing',
    'Inventory',
    'Store Management',
    'Sales',
    'Field Operations',
    'Administration'
  ];

  const roles = [
    'Administrator',
    'Manager',
    'Supervisor',
    'User'
  ];

  const fetchRequests = async () => {
    try {
      console.log('Fetching registration requests...');
      const requestsQuery = query(
        collection(db, 'user_registration_requests'),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(requestsQuery);
      
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RegistrationRequest[];
      
      console.log('Fetched requests:', requestsData.length);
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

  const openModifyDialog = (request: RegistrationRequest) => {
    console.log('Opening modify dialog for:', request);
    setSelectedRequest({
      ...request,
      modifiedDepartment: request.department,
      modifiedRole: request.role,
      modifiedSalary: 0,
      modifiedPermissions: [request.department]
    });
    setShowModifyDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !employee) {
      console.error('Missing selectedRequest or employee:', { selectedRequest, employee });
      return;
    }
    
    console.log('Starting approval process for:', selectedRequest.id);
    setProcessing(selectedRequest.id);
    
    try {
      // Step 1: Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      console.log('Generated temporary password');
      
      // Step 2: Create Firebase user
      console.log('Creating Firebase user for:', selectedRequest.email);
      const userCredential = await createUserWithEmailAndPassword(auth, selectedRequest.email, tempPassword);
      console.log('Firebase user created successfully:', userCredential.user.uid);
      
      // Step 3: Prepare employee data
      const employeeData = {
        name: `${selectedRequest.firstName} ${selectedRequest.lastName}`,
        email: selectedRequest.email.toLowerCase().trim(),
        phone: selectedRequest.phone,
        position: selectedRequest.modifiedRole || selectedRequest.role,
        department: selectedRequest.modifiedDepartment || selectedRequest.department,
        salary: selectedRequest.modifiedSalary || 0,
        role: selectedRequest.modifiedRole || selectedRequest.role,
        permissions: selectedRequest.modifiedPermissions || [selectedRequest.department],
        status: 'Active',
        join_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        authUserId: userCredential.user.uid,
        isOneTimePassword: true,
        mustChangePassword: true
      };
      
      console.log('Creating employee record with data:', employeeData);
      
      // Step 4: Create employee record
      const employeeDoc = await addDoc(collection(db, 'employees'), employeeData);
      console.log('Employee record created successfully:', employeeDoc.id);

      // Step 5: Update request status
      console.log('Updating request status to approved');
      await updateDoc(doc(db, 'user_registration_requests', selectedRequest.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: employee.name,
        finalDepartment: selectedRequest.modifiedDepartment || selectedRequest.department,
        finalRole: selectedRequest.modifiedRole || selectedRequest.role,
        finalSalary: selectedRequest.modifiedSalary || 0,
        finalPermissions: selectedRequest.modifiedPermissions || [selectedRequest.department],
        tempPassword: tempPassword,
        employeeId: employeeDoc.id
      });
      
      console.log('Request updated successfully');

      // Step 6: Generate credentials for printing
      const credentials = {
        name: `${selectedRequest.firstName} ${selectedRequest.lastName}`,
        email: selectedRequest.email,
        password: tempPassword,
        department: selectedRequest.modifiedDepartment || selectedRequest.department,
        role: selectedRequest.modifiedRole || selectedRequest.role,
        approvedBy: employee.name,
        approvedDate: new Date().toLocaleDateString(),
        companyName: "Great Pearl Coffee Company"
      };

      console.log('Generated credentials:', credentials);
      setGeneratedCredentials(credentials);

      // Step 7: Update local state
      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: 'approved' as const }
          : req
      ));

      console.log('Approval process completed successfully');
      
      toast({
        title: "Request Approved",
        description: `User ${selectedRequest.firstName} ${selectedRequest.lastName} has been approved and account created.`
      });

      setShowModifyDialog(false);
      
      // Ensure the credentials dialog shows
      setTimeout(() => {
        setShowCredentialsDialog(true);
      }, 100);

    } catch (error: any) {
      console.error('Detailed approval error:', error);
      
      let errorMessage = "Failed to approve request. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak.";
      } else if (error.code === 'permission-denied') {
        errorMessage = "You don't have permission to create employee records.";
      }
      
      toast({
        title: "Approval Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !employee || !rejectionReason.trim()) {
      console.error('Missing data for rejection:', { selectedRequest, employee, rejectionReason });
      return;
    }
    
    console.log('Rejecting request:', selectedRequest.id);
    setProcessing(selectedRequest.id);
    
    try {
      await updateDoc(doc(db, 'user_registration_requests', selectedRequest.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: employee.name,
        rejectionReason: rejectionReason.trim()
      });

      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: 'rejected' as const }
          : req
      ));

      toast({
        title: "Request Rejected",
        description: `Request from ${selectedRequest.firstName} ${selectedRequest.lastName} has been rejected.`
      });

      setRejectionReason('');
      setShowModifyDialog(false);
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

  const handleDeleteRequest = async (requestId: string) => {
    console.log('Deleting request:', requestId);
    
    try {
      await deleteDoc(doc(db, 'user_registration_requests', requestId));
      
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Request Deleted",
        description: "Registration request has been deleted successfully."
      });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const togglePermission = (permission: string) => {
    if (!selectedRequest) return;
    
    const currentPermissions = selectedRequest.modifiedPermissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setSelectedRequest({
      ...selectedRequest,
      modifiedPermissions: newPermissions
    });
  };

  const printCredentials = () => {
    if (!generatedCredentials) {
      console.error('No credentials to print');
      return;
    }
    
    console.log('Printing credentials for:', generatedCredentials.name);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your browser's popup settings.",
        variant: "destructive"
      });
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Login Credentials - ${generatedCredentials.companyName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              margin: 0;
              background: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 { 
              color: #2c3e50; 
              margin: 0;
              font-size: 28px;
            }
            .header h2 { 
              color: #34495e; 
              margin: 10px 0 0 0;
              font-size: 18px;
              font-weight: normal;
            }
            .credentials { 
              border: 2px solid #2c3e50; 
              padding: 25px; 
              margin: 20px 0; 
              background: #f8f9fa;
              border-radius: 5px;
            }
            .field { 
              margin: 12px 0; 
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .field:last-child {
              border-bottom: none;
            }
            .label { 
              font-weight: bold; 
              color: #2c3e50;
              display: inline-block;
              width: 150px;
            }
            .value {
              color: #34495e;
            }
            .password-field {
              background: #fff3cd;
              padding: 10px;
              border-radius: 4px;
              border: 1px solid #ffeaa7;
            }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 12px; 
              color: #7f8c8d;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
            .important {
              background: #e74c3c;
              color: white;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
            }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${generatedCredentials.companyName}</h1>
              <h2>Employee Login Credentials</h2>
            </div>
            
            <div class="credentials">
              <div class="field">
                <span class="label">Full Name:</span>
                <span class="value">${generatedCredentials.name}</span>
              </div>
              <div class="field">
                <span class="label">Email/Username:</span>
                <span class="value">${generatedCredentials.email}</span>
              </div>
              <div class="field password-field">
                <span class="label">Temporary Password:</span>
                <span class="value" style="font-family: monospace; font-size: 16px; font-weight: bold;">${generatedCredentials.password}</span>
              </div>
              <div class="field">
                <span class="label">Department:</span>
                <span class="value">${generatedCredentials.department}</span>
              </div>
              <div class="field">
                <span class="label">Role:</span>
                <span class="value">${generatedCredentials.role}</span>
              </div>
              <div class="field">
                <span class="label">Approved By:</span>
                <span class="value">${generatedCredentials.approvedBy}</span>
              </div>
              <div class="field">
                <span class="label">Approved Date:</span>
                <span class="value">${generatedCredentials.approvedDate}</span>
              </div>
            </div>
            
            <div class="important">
              IMPORTANT: You must change your password upon first login for security reasons.
            </div>
            
            <div class="footer">
              <p><strong>Security Notice:</strong> This document contains sensitive login information.</p>
              <p>Please keep this document secure and destroy it after the employee has successfully logged in and changed their password.</p>
              <p>For technical support, contact the IT department.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
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
            <UserPlus className="h-5 w-5" />
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
                    
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => openModifyDialog(request)}
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Review & Approve'
                          )}
                        </Button>
                      )}
                      
                      <AlertDialog open={deleteConfirmId === request.id} onOpenChange={() => setDeleteConfirmId(deleteConfirmId === request.id ? null : request.id)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(request.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Registration Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the registration request from {request.firstName} {request.lastName}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteRequest(request.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modify Request Dialog */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review and Modify Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input 
                    value={`${selectedRequest.firstName} ${selectedRequest.lastName}`} 
                    disabled 
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={selectedRequest.email} disabled />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select
                    value={selectedRequest.modifiedDepartment || selectedRequest.department}
                    onValueChange={(value) => setSelectedRequest({
                      ...selectedRequest,
                      modifiedDepartment: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={selectedRequest.modifiedRole || selectedRequest.role}
                    onValueChange={(value) => setSelectedRequest({
                      ...selectedRequest,
                      modifiedRole: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Monthly Salary (UGX)</Label>
                <Input
                  type="number"
                  value={selectedRequest.modifiedSalary || 0}
                  onChange={(e) => setSelectedRequest({
                    ...selectedRequest,
                    modifiedSalary: Number(e.target.value)
                  })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={(selectedRequest.modifiedPermissions || []).includes(permission)}
                        onCheckedChange={() => togglePermission(permission)}
                      />
                      <Label htmlFor={permission} className="text-sm">{permission}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Optional: Provide reason for rejection"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={processing === selectedRequest.id}
                  className="flex-1"
                >
                  {processing === selectedRequest.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing === selectedRequest.id || !rejectionReason.trim()}
                  className="flex-1"
                >
                  {processing === selectedRequest.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Account Created Successfully!</DialogTitle>
          </DialogHeader>
          {generatedCredentials && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-semibold">Account successfully created for {generatedCredentials.name}!</p>
              </div>
              
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div><strong>Name:</strong> {generatedCredentials.name}</div>
                <div><strong>Email:</strong> {generatedCredentials.email}</div>
                <div><strong>Department:</strong> {generatedCredentials.department}</div>
                <div><strong>Role:</strong> {generatedCredentials.role}</div>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <div><strong>Temporary Password:</strong></div>
                  <div className="font-mono text-lg font-bold text-blue-600">{generatedCredentials.password}</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={printCredentials} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Login Credentials
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCredentialsDialog(false)}
                >
                  Close
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 text-center">
                <p><strong>Important:</strong> User must change password on first login</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationRequestsManager;
