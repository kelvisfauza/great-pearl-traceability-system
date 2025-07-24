import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield } from "lucide-react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import UserList from './UserList';

interface UserManagementProps {
  employees: Employee[];
  onEmployeeAdded: (employee: any) => Promise<void>;
  onEmployeeUpdated: (id: string, updates: any) => Promise<void>;
  onEmployeeDeleted: (id: string) => Promise<void>;
}

export default function UserManagement({ employees, onEmployeeAdded, onEmployeeUpdated, onEmployeeDeleted }: UserManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const { refetch } = useEmployees();

  const handleAddUser = async (employeeData: any) => {
    try {
      console.log('UserManagement handleAddUser called with:', employeeData);
      
      // Generate one-time password
      const oneTimePassword = generateOneTimePassword();
      
      // Prepare employee data with one-time password flag
      const processedData = {
        ...employeeData,
        permissions: Array.isArray(employeeData.permissions) ? employeeData.permissions : [],
        isOneTimePassword: true,
        mustChangePassword: true
      };

      // Create user through Supabase edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          employeeData: {
            ...processedData,
            password: oneTimePassword
          }
        }
      });

      if (error) {
        console.error('Error creating user:', error);
        throw new Error(error.message || 'Failed to create user');
      }

      console.log('User created successfully:', data);
      
      // Add the employee to local state
      await onEmployeeAdded(processedData);
      
      setIsAddModalOpen(false);
      
      toast({
        title: "User Created Successfully",
        description: `User ${employeeData.name} created with one-time password: ${oneTimePassword}. They must change this password on first login.`
      });
      
      await refetch();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Failed to create user. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = `A user with the email "${employeeData.email}" already exists.`;
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. Please use a stronger password.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address format.";
            break;
          default:
            errorMessage = `Error: ${error.code}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const generateOneTimePassword = (): string => {
    // Generate a secure 8-character password with letters and numbers
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleEditUser = async (employeeData: any) => {
    if (!selectedEmployee) return;
    
    try {
      console.log('UserManagement handleEditUser called with:', employeeData);
      
      // Ensure permissions is an array
      const processedData = {
        ...employeeData,
        permissions: Array.isArray(employeeData.permissions) ? employeeData.permissions : []
      };
      
      await onEmployeeUpdated(selectedEmployee.id, processedData);
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      
      toast({
        title: "Success",
        description: `User ${employeeData.name} updated successfully`
      });

      await refetch();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (employee: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
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

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
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
            <CardDescription>Create and manage user accounts with system permissions</CardDescription>
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
                  Create a new user account with system permissions. A one-time password will be generated that the user must change on first login.
                </DialogDescription>
              </DialogHeader>
              <AddUserForm onSubmit={handleAddUser} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <UserList 
          employees={employees}
          onEdit={openEditModal}
          onDelete={handleDeleteUser}
        />
      </CardContent>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <EditUserForm 
              employee={selectedEmployee}
              onSubmit={handleEditUser}
              onCancel={() => {
                setIsEditModalOpen(false);
                setSelectedEmployee(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
