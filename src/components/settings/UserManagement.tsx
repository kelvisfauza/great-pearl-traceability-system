
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield, AlertTriangle } from "lucide-react";
import { useUnifiedEmployees, UnifiedEmployee } from "@/hooks/useUnifiedEmployees";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import UserList from './UserList';

interface UserManagementProps {
  employees: UnifiedEmployee[];
  onEmployeeAdded: (employee: any) => Promise<void>;
  onEmployeeUpdated: (id: string, updates: any) => Promise<void>;
  onEmployeeDeleted: (id: string) => Promise<void>;
}

export default function UserManagement({ employees, onEmployeeAdded, onEmployeeUpdated, onEmployeeDeleted }: UserManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UnifiedEmployee | null>(null);
  const { toast } = useToast();
  const { createEmployee, refetch } = useUnifiedEmployees();
  const { isAdmin } = useAuth();

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
      
      // Use the unified employee creation system (Supabase-based)
      const processedData = {
        ...employeeData,
        permissions: Array.isArray(employeeData.permissions) ? employeeData.permissions : [],
        email: employeeData.email.toLowerCase().trim() // Ensure email is normalized
      };

      console.log('Creating employee using unified system...');
      await createEmployee(processedData);
      
      console.log('Employee record created successfully');
      
      setIsAddModalOpen(false);
      
      toast({
        title: "User Created Successfully",
        description: `User ${employeeData.name} created successfully. They must change their password on first login.`
      });
      
      await refetch();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Failed to create user. Please try again.";
      
      if (error.message) {
        if (error.message.includes('already exists')) {
          errorMessage = error.message;
        } else if (error.message.includes('email')) {
          errorMessage = "Invalid email address or email already exists.";
        } else {
          errorMessage = error.message;
        }
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

  const handleDeleteUser = async (employee: UnifiedEmployee) => {
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

  const openEditModal = (employee: UnifiedEmployee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>System Unified:</strong> All user creation now uses the unified Supabase system. Users created here will be visible in HR and Admin sections.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Unified User Management
              </CardTitle>
              <CardDescription>
                Create and manage user accounts. All users are now stored in the unified database.
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
                  Create a new user account with system permissions. The user will be required to change their password on first login.
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
    </div>
  );
}
