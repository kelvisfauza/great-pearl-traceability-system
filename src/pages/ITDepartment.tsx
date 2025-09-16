import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor, 
  Database, 
  Shield, 
  Settings, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Wifi,
  HardDrive,
  Bug,
  Wrench,
  Globe,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import { useFirebaseTickets } from '@/hooks/useFirebaseTickets';
import { useFirebaseSystemMetrics } from '@/hooks/useFirebaseSystemMetrics';
import { usePresenceList } from '@/hooks/usePresenceList';


// IT Components
import ErrorDashboard from '@/components/it/ErrorDashboard';
import SecurityMonitoring from '@/components/it/SecurityMonitoring';
import UserManagement from '@/components/it/UserManagement';
import BackupManagement from '@/components/it/BackupManagement';
import NetworkMonitoring from '@/components/it/NetworkMonitoring';
import TicketSystem from '@/components/it/TicketSystem';
import SystemMaintenance from '@/components/it/SystemMaintenance';
import SystemConsoleMonitor from '@/components/it/SystemConsoleMonitor';
import DeletionRequestsManager from '@/components/admin/DeletionRequestsManager';
import { SMSFailureManager } from '@/components/it/SMSFailureManager';
import { ComprehensiveSMSManager } from '@/components/it/ComprehensiveSMSManager';

const ITDepartment = () => {
  const { hasPermission, employee } = useAuth();
  const { employees } = useFirebaseEmployees();
  const { tickets } = useFirebaseTickets();
  const { services } = useFirebaseSystemMetrics();
  const { onlineCount } = usePresenceList();

  // Calculate system uptime based on running services
  const runningServices = services.filter(s => s.status === 'running');
  const systemUptime = services.length > 0 ? ((runningServices.length / services.length) * 100).toFixed(1) : '0.0';
  
  // Count open tickets
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length;
  
  // Count active users
  const activeUsers = employees.filter(e => e.status === 'Active').length;

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
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Bug className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Tickets</p>
                  <p className="text-xl font-bold">{openTickets}</p>
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
        </div>

        <Tabs defaultValue="errors" className="space-y-6">

          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="errors">Error Dashboard</TabsTrigger>
            <TabsTrigger value="sms">SMS Support</TabsTrigger>
            <TabsTrigger value="console">Console Monitor</TabsTrigger>
            <TabsTrigger value="deletions">Deletions</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="space-y-4">
            <ErrorDashboard />
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <ComprehensiveSMSManager />
          </TabsContent>

          <TabsContent value="console" className="space-y-4">
            <SystemConsoleMonitor />
          </TabsContent>

          <TabsContent value="deletions" className="space-y-4">
            <DeletionRequestsManager />
          </TabsContent>

          <TabsContent value="security">
            <SecurityMonitoring />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="backup">
            <BackupManagement />
          </TabsContent>

          <TabsContent value="network">
            <NetworkMonitoring />
          </TabsContent>

          <TabsContent value="tickets">
            <TicketSystem />
          </TabsContent>

          <TabsContent value="maintenance">
            <SystemMaintenance />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ITDepartment;