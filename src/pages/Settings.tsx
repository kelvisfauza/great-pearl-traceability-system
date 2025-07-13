
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import UserProfile from "@/components/settings/UserProfile";
import UserManagement from "@/components/settings/UserManagement";
import { useEmployees } from "@/hooks/useEmployees";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = () => {
  const { employee } = useAuth();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployees();

  if (!employee) {
    return (
      <Layout title="Settings" subtitle="User settings and preferences">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to access settings.</p>
        </div>
      </Layout>
    );
  }

  // Check if user has permission to manage users
  const canManageUsers = employee.role === 'Administrator' || 
                         employee.role === 'Manager' || 
                         employee.permissions?.includes('Human Resources');

  return (
    <Layout 
      title="Settings" 
      subtitle="Manage your profile and account preferences"
    >
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users">User Management</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>
        
        {canManageUsers && (
          <TabsContent value="users">
            <UserManagement 
              employees={employees}
              onEmployeeAdded={addEmployee}
              onEmployeeUpdated={updateEmployee}
              onEmployeeDeleted={deleteEmployee}
            />
          </TabsContent>
        )}
      </Tabs>
    </Layout>
  );
};

export default Settings;
