
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus, Edit, Trash2, Shield, Key } from "lucide-react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  position: z.string().min(2, "Position is required"),
  department: z.string().min(2, "Department is required"),
  role: z.enum(["Administrator", "Manager", "Supervisor", "User", "Guest"]),
  salary: z.number().min(0, "Salary must be positive"),
  permissions: z.array(z.string()).optional(),
});

const editUserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  position: z.string().min(2, "Position is required"),
  department: z.string().min(2, "Department is required"),
  role: z.enum(["Administrator", "Manager", "Supervisor", "User", "Guest"]),
  salary: z.number().min(0, "Salary must be positive"),
  permissions: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;
type EditUserFormValues = z.infer<typeof editUserFormSchema>;

const availablePermissions = [
  "Human Resources", "Finance", "Procurement", "Quality Control",
  "Processing", "Store Management", "Inventory", "Sales & Marketing",
  "Field Operations", "Data Analysis", "Reports", "Logistics"
];

const departments = [
  "Human Resources", "Finance", "Operations", "Quality Control",
  "Sales", "Procurement", "Administration", "Field Operations"
];

interface UserManagementProps {
  employees: Employee[];
  onEmployeeAdded: (employee: any) => Promise<void>;
  onEmployeeUpdated: (employee: any) => Promise<void>;
  onEmployeeDeleted: (id: string) => Promise<void>;
}

export default function UserManagement({ employees, onEmployeeAdded, onEmployeeUpdated, onEmployeeDeleted }: UserManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const { toast } = useToast();
  const { refetch } = useEmployees();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      position: "",
      department: "",
      role: "User",
      salary: 0,
      permissions: [],
    },
  });

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      role: "User",
      salary: 0,
      permissions: [],
    },
  });

  const handleAddUser = async (values: UserFormValues) => {
    if (isCreatingUser) return;
    
    setIsCreatingUser(true);
    try {
      console.log('Creating Firebase user account for:', values.email);
      
      // Create Firebase authentication account first
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      console.log('Firebase user created:', userCredential.user.uid);

      // Now create the employee record with the Firebase UID
      const employeeData = {
        ...values,
        id: userCredential.user.uid, // Use Firebase UID as employee ID
        status: 'Active',
        join_date: new Date().toISOString(),
      };

      await onEmployeeAdded(employeeData);
      
      form.reset();
      setIsAddModalOpen(false);
      
      toast({
        title: "Success",
        description: `User ${values.name} created successfully with login credentials`
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Failed to create user. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = `A user with the email "${values.email}" already exists. Please use a different email address.`;
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address format.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = async (values: EditUserFormValues) => {
    if (!selectedEmployee || isUpdatingUser) return;
    
    setIsUpdatingUser(true);
    try {
      console.log('Starting user update for:', selectedEmployee.id);
      console.log('Update values:', values);
      
      // Create the update object with proper structure
      const updateData = {
        id: selectedEmployee.id,
        name: values.name.trim(),
        email: values.email.toLowerCase().trim(),
        phone: values.phone?.trim() || "",
        position: values.position.trim(),
        department: values.department.trim(),
        role: values.role,
        salary: Number(values.salary),
        permissions: values.permissions || [],
        // Preserve existing fields
        status: selectedEmployee.status || 'Active',
        join_date: selectedEmployee.join_date,
        created_at: selectedEmployee.created_at,
        updated_at: new Date().toISOString()
      };

      console.log('Calling onEmployeeUpdated with:', updateData);
      await onEmployeeUpdated(updateData);
      
      console.log('Update successful, closing modal');
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      editForm.reset();
      
      toast({
        title: "Success",
        description: `User ${values.name} updated successfully`
      });

      // Refresh the data
      await refetch();
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openEditModal = (employee: Employee) => {
    console.log('Opening edit modal for employee:', employee);
    setSelectedEmployee(employee);
    
    // Reset form with proper values
    editForm.reset({
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      department: employee.department || "",
      role: (employee.role as any) || "User",
      salary: Number(employee.salary) || 0,
      permissions: Array.isArray(employee.permissions) ? employee.permissions : [],
    });
    
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (employee: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}? This will also remove their login access.`)) {
      try {
        await onEmployeeDeleted(employee.id);
        toast({
          title: "Success",
          description: "User deleted successfully"
        });
        await refetch();
      } catch (error) {
        console.error('Delete error:', error);
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Create and manage user accounts with login credentials</CardDescription>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with login credentials and system permissions
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Login Username)</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Administrator">Administrator</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Supervisor">Supervisor</SelectItem>
                              <SelectItem value="User">User</SelectItem>
                              <SelectItem value="Guest">Guest</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                      <FormItem>
                        <FormLabel>Permissions</FormLabel>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {availablePermissions.map((permission) => (
                            <FormField
                              key={permission}
                              control={form.control}
                              name="permissions"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={permission}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(permission)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), permission])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== permission
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-xs font-normal">
                                      {permission}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreatingUser}>
                      <Key className="h-4 w-4 mr-2" />
                      {isCreatingUser ? "Creating..." : "Create User & Login"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees.map((employee) => (
            <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                    <p className="text-xs text-gray-400">{employee.position} • {employee.department}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{employee.role}</Badge>
                <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                  {employee.status}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(employee)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteUser(employee)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                          <SelectItem value="Guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={editForm.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {availablePermissions.map((permission) => (
                        <FormField
                          key={permission}
                          control={editForm.control}
                          name="permissions"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={permission}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(permission)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), permission])
                                        : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== permission
                                          )
                                        )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-normal">
                                  {permission}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedEmployee(null);
                    editForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingUser}>
                  {isUpdatingUser ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
