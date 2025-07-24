
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield } from "lucide-react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";
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
      await onEmployeeAdded(employeeData);
      setIsAddModalOpen(false);
      toast({
        title: "Success",
        description: `User ${employeeData.name} created successfully with login credentials`
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Failed to create user. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = `A user with the email "${employeeData.email}" already exists. Please use a different email address.`;
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
    }
  };

  const handleEditUser = async (employeeData: any) => {
    if (!selectedEmployee) return;
    
    try {
      await onEmployeeUpdated(selectedEmployee.id, employeeData);
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
