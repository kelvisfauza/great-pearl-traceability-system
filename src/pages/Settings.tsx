
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import UserProfile from "@/components/settings/UserProfile";
import UserManagement from "@/components/settings/UserManagement";
import SecurityMonitor from "@/components/SecurityMonitor";
import ProtectedContent from "@/components/ProtectedContent";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleBasedAccess } from "@/hooks/useRoleBasedAccess";
import { useSecureEmployees } from "@/hooks/useSecureEmployees";
import { Shield, Eye } from "lucide-react";

const Settings = () => {
  const { employee } = useAuth();
  const access = useRoleBasedAccess();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useSecureEmployees();

  // Wrapper functions to match UserManagement component expectations
  const handleEmployeeAdded = async (employeeData: any): Promise<void> => {
    await addEmployee(employeeData);
  };

  const handleEmployeeUpdated = async (id: string, updates: any): Promise<void> => {
    console.log('Settings handleEmployeeUpdated called with:', { id, updates });
    await updateEmployee(id, updates);
  };

  const handleEmployeeDeleted = async (id: string): Promise<void> => {
    await deleteEmployee(id);
  };

  // Determine available tabs
  const availableTabs = [];
  availableTabs.push("profile");
  if (access.canEditEmployees) availableTabs.push("users");
  if (access.roleLevel === 'admin') availableTabs.push("security");

  const gridCols = availableTabs.length === 1 ? "grid-cols-1" : 
                   availableTabs.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <Layout 
      title="Settings" 
      subtitle="Manage your account and system settings"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full ${gridCols}`}>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            {access.canEditEmployees && (
              <TabsTrigger value="users">
                <div className="flex items-center gap-2">
                  User Management
                  <Shield className="h-4 w-4" />
                </div>
              </TabsTrigger>
            )}
            {access.roleLevel === 'admin' && (
              <TabsTrigger value="security">
                <div className="flex items-center gap-2">
                  Security Monitor
                  <Eye className="h-4 w-4" />
                </div>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>
          
          <TabsContent value="users">
            <ProtectedContent requiredPermission="Human Resources">
              <UserManagement 
                employees={employees}
                onEmployeeAdded={handleEmployeeAdded}
                onEmployeeUpdated={handleEmployeeUpdated}
                onEmployeeDeleted={handleEmployeeDeleted}
              />
            </ProtectedContent>
          </TabsContent>

          <TabsContent value="security">
            <ProtectedContent requiredRole="Administrator">
              <SecurityMonitor />
            </ProtectedContent>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
