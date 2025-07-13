
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import UserProfile from "@/components/settings/UserProfile";
import UserManagement from "@/components/settings/UserManagement";
import { useAuth } from "@/contexts/AuthContext";
import { useSecureEmployees } from "@/hooks/useSecureEmployees";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";

const Settings = () => {
  const { employee, canManageEmployees } = useAuth();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useSecureEmployees();

  // Security check - only show user management to authorized users
  const canAccessUserManagement = canManageEmployees();

  // Wrapper functions to match UserManagement component expectations
  const handleEmployeeAdded = async (employeeData: any): Promise<void> => {
    await addEmployee(employeeData);
  };

  const handleEmployeeUpdated = async (employeeData: any): Promise<void> => {
    const { id, ...updates } = employeeData;
    await updateEmployee(id, updates);
  };

  const handleEmployeeDeleted = async (id: string): Promise<void> => {
    await deleteEmployee(id);
  };

  return (
    <Layout 
      title="Settings" 
      subtitle="Manage your account and system settings"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger 
              value="users" 
              disabled={!canAccessUserManagement}
              className={!canAccessUserManagement ? "opacity-50 cursor-not-allowed" : ""}
            >
              User Management
              {canAccessUserManagement && <Shield className="ml-2 h-4 w-4" />}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>
          
          {canAccessUserManagement ? (
            <TabsContent value="users">
              <UserManagement 
                employees={employees}
                onEmployeeAdded={handleEmployeeAdded}
                onEmployeeUpdated={handleEmployeeUpdated}
                onEmployeeDeleted={handleEmployeeDeleted}
              />
            </TabsContent>
          ) : (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Access Restricted
                  </CardTitle>
                  <CardDescription>
                    You don't have permission to access user management features.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    User management is restricted to HR personnel and administrators. 
                    If you need access to these features, please contact your administrator.
                  </p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Your current role:</strong> {employee?.role || 'Unknown'}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Your department:</strong> {employee?.department || 'Unknown'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
