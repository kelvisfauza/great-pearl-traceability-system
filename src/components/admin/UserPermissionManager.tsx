import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, UserCog, Shield, Save, RotateCcw } from 'lucide-react';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { updateEmployeePermissions, PERMISSION_SETS, setEmployeeRole } from '@/utils/updateEmployeePermissions';

// All available permissions in the system
const ALL_PERMISSIONS = [
  'General Access',
  'Human Resources', 
  'Finance',
  'Operations',
  'Reports',
  'Store Management',
  'Data Analysis',
  'Procurement',
  'Quality Control',
  'Inventory',
  'Processing',
  'Logistics',
  'Sales Marketing',
  'IT Department',
  'Administration'
];

const USER_ROLES = [
  'Administrator',
  'Manager', 
  'Data Analyst',
  'Supervisor',
  'User'
];

const UserPermissionManager = () => {
  const { employees, loading, refetch } = useUnifiedEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || ['General Access']);
    setSelectedRole(user.role || 'User');
  };

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permission]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const handleQuickRoleAssign = async (roleType: keyof typeof PERMISSION_SETS) => {
    if (!selectedUser) return;
    
    setUpdating(true);
    try {
      await setEmployeeRole(selectedUser.email, roleType);
      
      toast({
        title: "Role Updated",
        description: `${selectedUser.name} has been assigned ${roleType} role successfully.`,
      });
      
      await refetch();
      // Update local state
      const updatedPermissions = PERMISSION_SETS[roleType];
      const updatedRole = roleType === 'ADMIN' ? 'Administrator' : 
                         roleType.includes('MANAGER') ? 'Manager' :
                         roleType === 'SUPERVISOR' ? 'Supervisor' :
                         roleType === 'DATA_ANALYST' ? 'Data Analyst' : 'User';
      
      setSelectedPermissions(updatedPermissions);
      setSelectedRole(updatedRole);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCustomUpdate = async () => {
    if (!selectedUser || selectedPermissions.length === 0) {
      toast({
        title: "Invalid Selection",
        description: "Please select a user and at least one permission.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      await updateEmployeePermissions(selectedUser.email, {
        role: selectedRole,
        permissions: selectedPermissions
      });

      toast({
        title: "Permissions Updated",
        description: `${selectedUser.name}'s permissions have been updated successfully.`,
      });

      await refetch();
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update user permissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const resetToDefaults = () => {
    if (selectedUser) {
      setSelectedPermissions(selectedUser.permissions || ['General Access']);
      setSelectedRole(selectedUser.role || 'User');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            User Permission Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Selection */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.email}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.email === employee.email
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleUserSelect(employee)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {employee.department} • {employee.position}
                        </p>
                      </div>
                      <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                        {employee.role}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(employee.permissions || []).slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {(employee.permissions || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(employee.permissions || []).length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permission Management */}
            <div className="space-y-4">
              {selectedUser ? (
                <>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium mb-2">Editing: {selectedUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>

                  {/* Quick Role Assignment */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Quick Role Assignment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleQuickRoleAssign('ADMIN')}
                          disabled={updating}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleQuickRoleAssign('MANAGER')}
                          disabled={updating}
                        >
                          Manager
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleQuickRoleAssign('DATA_ANALYST')}
                          disabled={updating}
                        >
                          Data Analyst
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleQuickRoleAssign('USER')}
                          disabled={updating}
                        >
                          Basic User
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Custom Role & Permissions */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Custom Role & Permissions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Role</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Permissions</Label>
                        <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto">
                          {ALL_PERMISSIONS.map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission}
                                checked={selectedPermissions.includes(permission)}
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

                      <div className="flex gap-2">
                        <Button 
                          onClick={handleCustomUpdate}
                          disabled={updating}
                          className="flex-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {updating ? 'Updating...' : 'Update Permissions'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={resetToDefaults}
                          disabled={updating}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Current Permissions Display */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Current Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {selectedPermissions.map((permission) => (
                          <Badge key={permission} variant="secondary">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a user from the list to manage their permissions</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserPermissionManager;