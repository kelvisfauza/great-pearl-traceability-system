import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Search, Shield, Ban, CheckCircle, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddUserForm from "@/components/settings/AddUserForm";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string;
  status: string;
  permissions: string[];
  auth_user_id: string | null;
  disabled: boolean;
}

export function ITUserManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (employeeId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      
      const { error } = await supabase
        .from('employees')
        .update({ status: newStatus })
        .eq('id', employeeId);

      if (error) throw error;

      toast.success(`User ${newStatus === 'Active' ? 'enabled' : 'disabled'} successfully`);
      fetchEmployees();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error("Failed to update user status");
    }
  };

  const updateEmployee = async (updates: Partial<Employee>) => {
    if (!selectedEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast.success("User updated successfully");
      setEditDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error("Failed to update user");
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          ...userData,
          linkExisting: false
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`User created successfully! Temp password: ${data.tempPassword}`, {
          duration: 10000
        });
        setCreateDialogOpen(false);
        fetchEmployees();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        toast.error("User with this email already exists");
      } else {
        toast.error("Failed to create user");
      }
      throw error;
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Super Admin': 'bg-red-500',
      'Administrator': 'bg-orange-500',
      'Manager': 'bg-blue-500',
      'Supervisor': 'bg-green-500',
      'User': 'bg-gray-500'
    };
    return colors[role] || 'bg-gray-500';
  };

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <AddUserForm onSubmit={handleCreateUser} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auth Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{employee.email}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(employee.role)}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.auth_user_id ? 'default' : 'outline'}>
                      {employee.auth_user_id ? 'Linked' : 'No Auth'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog open={editDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={setEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEmployee(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Name</Label>
                              <Input
                                defaultValue={employee.name}
                                onChange={(e) => setSelectedEmployee({ ...employee, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Role</Label>
                              <Select
                                defaultValue={employee.role}
                                onValueChange={(value) => setSelectedEmployee({ ...employee, role: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                                  <SelectItem value="Administrator">Administrator</SelectItem>
                                  <SelectItem value="Manager">Manager</SelectItem>
                                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                                  <SelectItem value="User">User</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Department</Label>
                              <Input
                                defaultValue={employee.department}
                                onChange={(e) => setSelectedEmployee({ ...employee, department: e.target.value })}
                              />
                            </div>
                            <Button onClick={() => updateEmployee(selectedEmployee!)} className="w-full">
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant={employee.status === 'Active' ? 'destructive' : 'default'}
                        onClick={() => toggleUserStatus(employee.id, employee.status)}
                      >
                        {employee.status === 'Active' ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
