import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor, 
  Shield, 
  Users, 
  Server
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePresenceList } from '@/hooks/usePresenceList';
import { supabase } from '@/integrations/supabase/client';

// IT Components
import ErrorDashboard from '@/components/it/ErrorDashboard';
import SecurityMonitoring from '@/components/it/SecurityMonitoring';
import BackupManagement from '@/components/it/BackupManagement';
import DeletionRequestsManager from '@/components/admin/DeletionRequestsManager';
import { ComprehensiveSMSManager } from '@/components/it/ComprehensiveSMSManager';
import { ITUserManagement } from '@/components/it/ITUserManagement';
import { ITPermissionManager } from '@/components/it/ITPermissionManager';
import ReportRemindersSettings from '@/components/it/ReportRemindersSettings';

const ITDepartment = () => {
  const { hasPermission, employee } = useAuth();
  const { onlineCount } = usePresenceList();
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch active users from Supabase instead of Firebase
  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const { count, error } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Active');
        
        if (!error && count !== null) {
          setActiveUsers(count);
        }
      } catch (err) {
        console.error('Error fetching active users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveUsers();
  }, []);

  // System uptime - static for now since we're using Supabase
  const systemUptime = '99.9';

  if (!hasPermission('IT Management')) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Monitor className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access IT Department management.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">IT Department</h1>
          <p className="text-muted-foreground">
            Manage system infrastructure, security, and technical support
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Server className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Uptime</p>
                  <p className="text-xl font-bold">{systemUptime}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Level</p>
                  <p className="text-xl font-bold text-green-600">High</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Online Users</p>
                  <p className="text-xl font-bold">{onlineCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-xl font-bold">{activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="permissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="user-management">Users</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="deletions">Deletions</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-4">
            <ITPermissionManager />
          </TabsContent>

          <TabsContent value="user-management" className="space-y-4">
            <ITUserManagement />
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <ErrorDashboard />
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <ComprehensiveSMSManager />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <ReportRemindersSettings />
          </TabsContent>

          <TabsContent value="deletions" className="space-y-4">
            <DeletionRequestsManager />
          </TabsContent>

          <TabsContent value="security">
            <SecurityMonitoring />
          </TabsContent>

          <TabsContent value="backup">
            <BackupManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ITDepartment;