import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Search, 
  KeyRound, 
  Edit, 
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  PERMISSION_MODULES, 
  PERMISSION_ACTIONS,
  MODULE_ACTIONS,
  GRANULAR_ROLE_PRESETS,
  type PermissionModule,
  type PermissionAction
} from '@/types/granularPermissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string;
  permissions: string[];
  status: string;
}

export function ITPermissionManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('User');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermissionDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectedPermissions(employee.permissions || []);
    setSelectedRole(employee.role);
    setPermissionDialogOpen(true);
  };

  const handleOpenPasswordDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          permissions: selectedPermissions,
          role: selectedRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast.success('Permissions updated successfully');
      setPermissionDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee?.email) return;

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { 
          email: selectedEmployee.email,
          newPassword: newPassword
        }
      });

      if (error) throw error;

      toast.success(`Password updated successfully for ${selectedEmployee.email}`);
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    // Auto-apply role preset permissions
    const roleKey = role.replace(' ', '_').toUpperCase() as keyof typeof GRANULAR_ROLE_PRESETS;
    if (GRANULAR_ROLE_PRESETS[roleKey]) {
      setSelectedPermissions(GRANULAR_ROLE_PRESETS[roleKey]);
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleModuleAction = (module: PermissionModule, action: PermissionAction) => {
    const permission = `${module}:${action}`;
    togglePermission(permission);
  };

  const isActionSelected = (module: PermissionModule, action: PermissionAction) => {
    return selectedPermissions.includes(`${module}:${action}`);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          IT Permission & Password Manager
        </CardTitle>
        <CardDescription>
          Manage user permissions and reset passwords
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredEmployees.map((employee) => (
                <Card key={employee.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{employee.name}</h4>
                          <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                          <Badge className="bg-primary">
                            {employee.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {employee.department} • {employee.permissions?.length || 0} permissions
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPermissionDialog(employee)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Permissions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPasswordDialog(employee)}
                        >
                          <KeyRound className="h-4 w-4 mr-1" />
                          Password
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Permission Management Dialog */}
        <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Manage Permissions - {selectedEmployee?.name}</DialogTitle>
              <DialogDescription>
                Assign role and granular permissions for {selectedEmployee?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Super Admin">Super Admin (All Access)</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-6">
                  {Object.entries(PERMISSION_MODULES).map(([key, module]) => {
                    const moduleActions = MODULE_ACTIONS[module as PermissionModule];
                    
                    return (
                      <div key={key} className="space-y-2">
                        <h4 className="font-semibold text-sm">{module}</h4>
                        <div className="grid grid-cols-2 gap-2 ml-4">
                          {moduleActions.map((action) => (
                            <div key={action} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${module}-${action}`}
                                checked={isActionSelected(module as PermissionModule, action)}
                                onCheckedChange={() => toggleModuleAction(module as PermissionModule, action)}
                              />
                              <Label
                                htmlFor={`${module}-${action}`}
                                className="text-sm cursor-pointer"
                              >
                                {action}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button onClick={handleSavePermissions} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Permissions
                </Button>
                <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password - {selectedEmployee?.name}</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedEmployee?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleResetPassword} className="flex-1">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
                <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
