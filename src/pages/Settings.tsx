
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, UserCog, Key } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import UserManagement from '@/components/settings/UserManagement';
import UserProfile from '@/components/settings/UserProfile';
import QuickEmployeeUpdate from '@/components/admin/QuickEmployeeUpdate';
import UserManagementPanel from '@/components/admin/UserManagementPanel';

const Settings = () => {
  const { canManageEmployees, isAdmin, hasPermission } = useAuth();
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
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and system preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Profile
            </TabsTrigger>
            {hasPermission('Human Resources') && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </TabsTrigger>
            )}
            {isAdmin() && (
              <>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </TabsTrigger>
                <TabsTrigger value="quick-update" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Quick Access
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <UserProfile />
          </TabsContent>

          {hasPermission('Human Resources') && (
            <TabsContent value="users">
              <UserManagement 
                employees={employees}
                onEmployeeAdded={handleEmployeeAdded}
                onEmployeeUpdated={handleEmployeeUpdated}
                onEmployeeDeleted={handleEmployeeDeleted}
              />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="admin">
              <UserManagementPanel />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="quick-update" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Quick Employee Access Update
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QuickEmployeeUpdate />
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
