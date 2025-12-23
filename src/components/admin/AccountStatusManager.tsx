import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, UserX, UserCheck, Shield, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SalaryPaymentMessageDialog from '@/components/hr/SalaryPaymentMessageDialog';

const AccountStatusManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const { employees, loading } = useUnifiedEmployees();
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

  const handleToggleAccountStatus = async (employee: any, disable: boolean) => {
    setUpdating(employee.id);
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('employees')
        .update({ disabled: disable })
        .eq('email', employee.email);

      if (error) throw error;

      // Update in Firebase for consistency
      try {
        const { updateEmployeePermissions } = await import('@/utils/updateEmployeePermissions');
        await updateEmployeePermissions(employee.email, { disabled: disable });
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }

      toast({
        title: disable ? "Account Disabled" : "Account Enabled",
        description: `${employee.name}'s account has been ${disable ? 'disabled' : 'enabled'}.`,
        variant: disable ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Error updating account status:', error);
      toast({
        title: "Error",
        description: "Failed to update account status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        disabled={updating === employee.id}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Disable
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to disable {employee.name}'s account? 
                          They will not be able to log in to the system until re-enabled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleToggleAccountStatus(employee, true)}
                          disabled={updating === employee.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disable Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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