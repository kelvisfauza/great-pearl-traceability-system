import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, UserX, UserCheck, Shield, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SalaryPaymentMessageDialog from '@/components/hr/SalaryPaymentMessageDialog';

const AccountStatusManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableReason, setDisableReason] = useState('');
  const [employeeToDisable, setEmployeeToDisable] = useState<any>(null);
  const { employees, loading, refetch } = useUnifiedEmployees();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">Only administrators can manage account status.</p>
        </CardContent>
      </Card>
    );
  }

  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendSuspensionSMS = async (employee: any, reason: string) => {
    if (!employee.phone) {
      console.warn('No phone number for employee:', employee.name);
      return;
    }

    try {
      const message = `Dear ${employee.name}, your account at Great Pearl Coffee has been suspended. Reason: ${reason}. Contact management for details.`;
      
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: employee.phone,
          message
        }
      });

      if (error) {
        console.error('Failed to send suspension SMS:', error);
        toast({
          title: "SMS Failed",
          description: "Account was disabled but SMS notification failed to send.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "SMS Sent",
          description: `Suspension notification sent to ${employee.name}.`
        });
      }
    } catch (error) {
      console.error('Error sending suspension SMS:', error);
    }
  };

  const handleToggleAccountStatus = async (employee: any, disable: boolean, reason?: string) => {
    setUpdating(employee.id);
    try {
      // Update in Supabase with reason if disabling
      const updateData: { disabled: boolean; disabled_reason?: string; disabled_at?: string } = { 
        disabled: disable 
      };
      
      if (disable && reason) {
        updateData.disabled_reason = reason;
        updateData.disabled_at = new Date().toISOString();
      } else if (!disable) {
        updateData.disabled_reason = null as any;
        updateData.disabled_at = null as any;
      }

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('email', employee.email);

      if (error) throw error;

      // Update in Firebase for consistency
      try {
        const { updateEmployeePermissions } = await import('@/utils/updateEmployeePermissions');
        await updateEmployeePermissions(employee.email, { disabled: disable });
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }

      // Send SMS notification when disabling
      if (disable && reason) {
        await sendSuspensionSMS(employee, reason);
      }

      toast({
        title: disable ? "Account Disabled" : "Account Enabled",
        description: `${employee.name}'s account has been ${disable ? 'disabled' : 'enabled'}.`,
        variant: disable ? "destructive" : "default"
      });

      // Refresh employee list
      refetch();

    } catch (error) {
      console.error('Error updating account status:', error);
      toast({
        title: "Error",
        description: "Failed to update account status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
      setShowDisableDialog(false);
      setDisableReason('');
      setEmployeeToDisable(null);
    }
  };

  const openDisableDialog = (employee: any) => {
    setEmployeeToDisable(employee);
    setDisableReason('');
    setShowDisableDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading employees...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5" />
          Account Status Management
        </CardTitle>
        <CardDescription>
          Disable or enable user accounts. Disabled users cannot log in to the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                    <p className="text-xs text-muted-foreground">{employee.position} • {employee.department}</p>
                    {employee.disabled && (employee as any).disabled_reason && (
                      <p className="text-xs text-destructive mt-1">
                        Reason: {(employee as any).disabled_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowMessageDialog(true);
                  }}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Message
                </Button>
                
                <Badge variant={employee.disabled ? "destructive" : "default"}>
                  {employee.disabled ? "Disabled" : "Active"}
                </Badge>
                
                {employee.disabled ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={updating === employee.id}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Enable
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Enable Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to enable {employee.name}'s account? 
                          They will be able to log in to the system.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleToggleAccountStatus(employee, false)}
                          disabled={updating === employee.id}
                        >
                          Enable Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    disabled={updating === employee.id}
                    onClick={() => openDisableDialog(employee)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Disable
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8">
              <UserX className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No employees found</p>
            </div>
          )}
        </div>

        {/* Disable Account Dialog with Reason */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable Account</DialogTitle>
              <DialogDescription>
                Disable {employeeToDisable?.name}'s account. They will receive an SMS notification about the suspension.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for suspension *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for disabling this account..."
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be sent to the user via SMS.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleToggleAccountStatus(employeeToDisable, true, disableReason)}
                disabled={!disableReason.trim() || updating === employeeToDisable?.id}
              >
                {updating === employeeToDisable?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Disable Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SalaryPaymentMessageDialog
          isOpen={showMessageDialog}
          onClose={() => {
            setShowMessageDialog(false);
            setSelectedEmployee(null);
          }}
          employeeName={selectedEmployee?.name || ''}
          employeePhone={selectedEmployee?.phone || ''}
        />
      </CardContent>
    </Card>
  );
};

export default AccountStatusManager;
