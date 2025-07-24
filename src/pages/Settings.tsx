
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import UserManagement from '@/components/settings/UserManagement';
import UserProfile from '@/components/settings/UserProfile';

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
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and system preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {canManageEmployees() && (
              <TabsTrigger value="users">User Management</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <UserProfile />
          </TabsContent>

          {canManageEmployees() && (
            <TabsContent value="users">
              <UserManagement 
                employees={employees}
                onEmployeeAdded={handleEmployeeAdded}
                onEmployeeUpdated={handleEmployeeUpdated}
                onEmployeeDeleted={handleEmployeeDeleted}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
