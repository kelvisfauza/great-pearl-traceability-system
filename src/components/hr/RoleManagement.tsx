import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCombinedEmployees } from '@/hooks/useCombinedEmployees';
import { updateEmployeePermissions, setEmployeeRole, PERMISSION_SETS } from '@/utils/updateEmployeePermissions';
import RoleAssignmentManager from '@/components/admin/RoleAssignmentManager';
import { 
  Shield, 
  Users, 
  Crown, 
  Settings,
  Search,
  Save,
  UserCog
} from 'lucide-react';

const RoleManagement = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { employees, loading, refetch } = useCombinedEmployees();
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availablePermissions = [
    'Human Resources', 'Finance', 'Operations', 'Reports', 'Store Management',
    'Data Analysis', 'Procurement', 'Quality Control', 'Inventory', 'Processing',
    'Logistics', 'Sales Marketing', 'Milling', 'Field Operations'
  ];

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setSelectedEmployee(employeeId);
      setSelectedRole(employee.role || 'User');
      setSelectedPermissions(employee.permissions || []);
      setCustomPermissions(employee.permissions || []);
    }
  };

  const handleRoleSelect = (roleType: keyof typeof PERMISSION_SETS) => {
    const permissions = PERMISSION_SETS[roleType];
    setSelectedPermissions(permissions);
    setCustomPermissions(permissions);
  };

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    if (checked) {
      setCustomPermissions(prev => [...prev, permission]);
    } else {
      setCustomPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const handleQuickRoleUpdate = async (roleType: keyof typeof PERMISSION_SETS) => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee first",
        variant: "destructive"
      });
      return;
    }

    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (!employee) return;

    setUpdating(true);
    try {
      await setEmployeeRole(employee.email, roleType);
      toast({
        title: "Success",
        description: `Role updated to ${roleType.replace('_', ' ')} successfully`,
      });
      await refetch();
      
      // Update local state
      const newPermissions = PERMISSION_SETS[roleType];
      setSelectedPermissions(newPermissions);
      setCustomPermissions(newPermissions);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update employee role",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCustomPermissionUpdate = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee first",
        variant: "destructive"
      });
      return;
    }

    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (!employee) return;

    setUpdating(true);
    try {
      await updateEmployeePermissions(employee.email, {
        role: selectedRole,
        permissions: customPermissions
      });
      
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
      await refetch();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update employee permissions",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">Only administrators can manage roles and permissions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="permissions">Role & Permissions</TabsTrigger>
          <TabsTrigger value="assignments">Role Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Employee Role & Permission Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee Selection */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search Employees</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by name, email, or position..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Employee</Label>
                  <Select value={selectedEmployee} onValueChange={handleEmployeeSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an employee to manage" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{employee.name} - {employee.position}</span>
                            <Badge variant="outline" className="ml-2">
                              {employee.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedEmployee && (
                <>
                  {/* Quick Role Assignment */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Quick Role Assignment</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.keys(PERMISSION_SETS).map((roleType) => (
                        <Button
                          key={roleType}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-center gap-2"
                          onClick={() => handleQuickRoleUpdate(roleType as keyof typeof PERMISSION_SETS)}
                          disabled={updating}
                        >
                          {roleType === 'ADMIN' && <Crown className="h-5 w-5" />}
                          {roleType.includes('MANAGER') && <Shield className="h-5 w-5" />}
                          {roleType === 'SUPERVISOR' && <Users className="h-5 w-5" />}
                          {!roleType.includes('MANAGER') && roleType !== 'ADMIN' && roleType !== 'SUPERVISOR' && (
                            <Settings className="h-5 w-5" />
                          )}
                          <span className="text-sm text-center">
                            {roleType.replace('_', ' ')}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Permissions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Custom Permissions</h3>
                    
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {availablePermissions.map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission}
                              checked={customPermissions.includes(permission)}
                              onCheckedChange={(checked) => 
                                handlePermissionToggle(permission, checked as boolean)
                              }
                            />
                            <Label htmlFor={permission} className="text-sm">
                              {permission}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={handleCustomPermissionUpdate}
                      disabled={updating}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updating ? 'Updating...' : 'Update Permissions'}
                    </Button>
                  </div>

                  {/* Current Permissions Display */}
                  <div className="space-y-2">
                    <Label>Current Permissions</Label>
                    <div className="flex flex-wrap gap-2">
                      {customPermissions.map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <RoleAssignmentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoleManagement;