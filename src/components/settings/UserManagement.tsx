
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield, AlertTriangle } from "lucide-react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecureEmployees } from '@/hooks/useSecureEmployees';
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
  const { isAdmin } = useAuth();
  const { addEmployee } = useSecureEmployees();

  // Only administrators can access user management
  if (!isAdmin()) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">
            Only administrators can manage user accounts. Contact your system administrator if you need access.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleAddUser = async (employeeData: any) => {
    try {
      console.log('UserManagement handleAddUser called with:', employeeData);
      
      // Generate one-time password
      const oneTimePassword = generateOneTimePassword();
      
      // First, create the employee record in Firebase
      const processedData = {
        ...employeeData,
        permissions: Array.isArray(employeeData.permissions) ? employeeData.permissions : [],
        isOneTimePassword: true,
        mustChangePassword: true
      };

      console.log('Creating employee record in Firebase first...');
      const firebaseEmployee = await addEmployee(processedData);
      
      console.log('Employee record created in Firebase:', firebaseEmployee);

      // Then create the authentication user through Supabase
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          employeeData: {
            ...processedData,
            password: oneTimePassword
          }
        }
      });

      if (error) {
        console.error('Error creating auth user:', error);
        // If auth user creation fails, we should handle cleanup if needed
        throw new Error(error.message || 'Failed to create authentication user');
      }

      console.log('Auth user created successfully:', data);
      
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
            <CardDescription>
              Create and manage user accounts with system permissions (Administrator Only)
            </CardDescription>
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
