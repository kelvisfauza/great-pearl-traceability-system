import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import { setEmployeeRole, updateEmployeePermissions, PERMISSION_SETS } from '@/utils/updateEmployeePermissions';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Shield, 
  Search, 
  Filter,
  Eye,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface NewUserForm {
  name: string;
  email: string;
  position: string;
  department: string;
  roleType: keyof typeof PERMISSION_SETS;
  phone: string;
  salary: string;
  address: string;
  emergencyContact: string;
}

const UserManagementPanel = () => {
  const { employees, loading, addEmployee, updateEmployee } = useFirebaseEmployees();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    name: '',
    email: '',
    position: '',
    department: '',
    roleType: 'USER',
    phone: '',
    salary: '',
    address: '',
    emergencyContact: ''
  });

  const departments = [
    'Human Resources', 'Finance', 'Operations', 'Quality Control',
    'Procurement', 'Store Management', 'Data Analysis', 'Sales & Marketing',
    'Logistics', 'Administration'
  ];

  const roleDescriptions = {
    ADMIN: { 
      title: 'Administrator', 
      description: 'Full system access - all modules and administrative functions',
      permissions: PERMISSION_SETS.ADMIN,
      badge: 'destructive'
    },
    MANAGER: { 
      title: 'General Manager', 
      description: 'Comprehensive access across all operational modules',
      permissions: PERMISSION_SETS.MANAGER,
      badge: 'default'
    },
    HR_MANAGER: { 
      title: 'HR Manager', 
      description: 'Human Resources, Finance, and Reports management',
      permissions: PERMISSION_SETS.HR_MANAGER,
      badge: 'secondary'
    },
    FINANCE_MANAGER: { 
      title: 'Finance Manager', 
      description: 'Finance, Reports, and HR oversight',
      permissions: PERMISSION_SETS.FINANCE_MANAGER,
      badge: 'secondary'
    },
    OPERATIONS_MANAGER: { 
      title: 'Operations Manager', 
      description: 'Operations, Inventory, Quality Control, and Store Management',
      permissions: PERMISSION_SETS.OPERATIONS_MANAGER,
      badge: 'secondary'
    },
    DATA_ANALYST: { 
      title: 'Data Analyst', 
      description: 'Data Analysis and Reports only',
      permissions: PERMISSION_SETS.DATA_ANALYST,
      badge: 'outline'
    },
    SUPERVISOR: { 
      title: 'Supervisor', 
      description: 'Operations, Quality Control, and Reports supervision',
      permissions: PERMISSION_SETS.SUPERVISOR,
      badge: 'outline'
    },
    USER: { 
      title: 'Regular User', 
      description: 'Basic access to assigned modules only',
      permissions: PERMISSION_SETS.USER,
      badge: 'outline'
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || employee.role === filterRole;
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    
    return matchesSearch && matchesRole && matchesDepartment;
  });

  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.position || !newUserForm.department) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Get role details
      const roleInfo = roleDescriptions[newUserForm.roleType];
      
      // Create employee record
      const employeeData = {
        name: newUserForm.name,
        email: newUserForm.email,
        position: newUserForm.position,
        department: newUserForm.department,
        role: roleInfo.title,
        permissions: roleInfo.permissions,
        phone: newUserForm.phone || '',
        salary: parseFloat(newUserForm.salary) || 0,
        address: newUserForm.address || '',
        emergency_contact: newUserForm.emergencyContact || '',
        status: 'Active',
        join_date: new Date().toISOString()
      };

      await addEmployee(employeeData);
      
      toast({
        title: "Success",
        description: `User ${newUserForm.name} created successfully with ${roleInfo.title} role`,
      });

      // Reset form
      setNewUserForm({
        name: '',
        email: '',
        position: '',
        department: '',
        roleType: 'USER',
        phone: '',
        salary: '',
        address: '',
        emergencyContact: ''
      });
      
      setShowCreateModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateUserRole = async (employee: any, newRoleType: keyof typeof PERMISSION_SETS) => {
    setProcessing(true);
    try {
      const roleInfo = roleDescriptions[newRoleType];
      
      // Update via utility function
      await setEmployeeRole(employee.email, newRoleType);
      
      // Also update in Firebase
      await updateEmployee(employee.id, {
        role: roleInfo.title,
        permissions: roleInfo.permissions
      });
      
      toast({
        title: "Success",
        description: `${employee.name}'s role updated to ${roleInfo.title}`,
      });
      
      setShowEditModal(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    const roleKey = Object.keys(roleDescriptions).find(key => 
      roleDescriptions[key as keyof typeof roleDescriptions].title === role
    ) as keyof typeof roleDescriptions;
    
    return roleKey ? roleDescriptions[roleKey].badge : 'outline';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management & Access Control
          </CardTitle>
          <CardDescription>
            Manage user roles, permissions, and access levels across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="roles">Role Definitions</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {Object.entries(roleDescriptions).map(([key, info]) => (
                        <SelectItem key={key} value={info.title}>{info.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create New User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Set up a new user with appropriate role and permissions
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={newUserForm.name}
                          onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                          placeholder="Enter full name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                          placeholder="user@company.com"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="position">Position *</Label>
                        <Input
                          id="position"
                          value={newUserForm.position}
                          onChange={(e) => setNewUserForm({...newUserForm, position: e.target.value})}
                          placeholder="Job title/position"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="department">Department *</Label>
                        <Select 
                          value={newUserForm.department} 
                          onValueChange={(value) => setNewUserForm({...newUserForm, department: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor="roleType">Role & Access Level *</Label>
                        <Select 
                          value={newUserForm.roleType} 
                          onValueChange={(value) => setNewUserForm({...newUserForm, roleType: value as keyof typeof PERMISSION_SETS})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleDescriptions).map(([key, info]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{info.title}</span>
                                  <span className="text-sm text-gray-500">{info.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {newUserForm.roleType && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium">Permissions for {roleDescriptions[newUserForm.roleType].title}:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {roleDescriptions[newUserForm.roleType].permissions.map((permission, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {permission}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={newUserForm.phone}
                          onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
                          placeholder="+256..."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="salary">Salary (UGX)</Label>
                        <Input
                          id="salary"
                          type="number"
                          value={newUserForm.salary}
                          onChange={(e) => setNewUserForm({...newUserForm, salary: e.target.value})}
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={newUserForm.address}
                          onChange={(e) => setNewUserForm({...newUserForm, address: e.target.value})}
                          placeholder="Physical address"
                          rows={2}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor="emergencyContact">Emergency Contact</Label>
                        <Input
                          id="emergencyContact"
                          value={newUserForm.emergencyContact}
                          onChange={(e) => setNewUserForm({...newUserForm, emergencyContact: e.target.value})}
                          placeholder="Emergency contact information"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser} disabled={processing}>
                        {processing ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Users Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                              <div className="text-sm text-gray-500">{employee.position}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(employee.role) as any}>
                              {employee.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>
                            <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {employee.permissions?.slice(0, 2).map((permission: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {permission}
                                </Badge>
                              ))}
                              {employee.permissions?.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{employee.permissions.length - 2} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <div className="grid gap-4">
                {Object.entries(roleDescriptions).map(([key, info]) => (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={info.badge as any}>{info.title}</Badge>
                          <CardTitle className="text-lg">{key}</CardTitle>
                        </div>
                      </div>
                      <CardDescription>{info.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {info.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the role and permissions for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">Current Role</h4>
                <Badge variant={getRoleBadgeVariant(selectedEmployee.role) as any} className="mt-1">
                  {selectedEmployee.role}
                </Badge>
              </div>
              
              <div>
                <Label>New Role</Label>
                <div className="grid gap-2 mt-2">
                  {Object.entries(roleDescriptions).map(([key, info]) => (
                    <Button
                      key={key}
                      variant={selectedEmployee.role === info.title ? "default" : "outline"}
                      className="justify-start h-auto p-4"
                      onClick={() => handleUpdateUserRole(selectedEmployee, key as keyof typeof PERMISSION_SETS)}
                      disabled={processing}
                    >
                      <div className="text-left">
                        <div className="font-medium">{info.title}</div>
                        <div className="text-sm opacity-75">{info.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPanel;