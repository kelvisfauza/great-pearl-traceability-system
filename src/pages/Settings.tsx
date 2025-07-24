
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from '@/components/settings/UserManagement';
import UserRegistrationRequests from '@/components/UserRegistrationRequests';
import UserProfile from '@/components/settings/UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';

const Settings = () => {
  const { canManageEmployees } = useAuth();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useFirebaseEmployees();

  // Wrapper functions to match the expected interface
  const handleEmployeeAdded = async (employee: any): Promise<void> => {
    await addEmployee(employee);
  };

  const handleEmployeeUpdated = async (id: string, updates: any): Promise<void> => {
    await updateEmployee(id, updates);
  };

  const handleEmployeeDeleted = async (id: string): Promise<void> => {
    await deleteEmployee(id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and system preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {canManageEmployees() && (
            <>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="requests">Registration Requests</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>

        {canManageEmployees() && (
          <>
            <TabsContent value="users">
              <UserManagement 
                employees={employees}
                onEmployeeAdded={handleEmployeeAdded}
                onEmployeeUpdated={handleEmployeeUpdated}
                onEmployeeDeleted={handleEmployeeDeleted}
              />
            </TabsContent>
            
            <TabsContent value="requests">
              <UserRegistrationRequests />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
