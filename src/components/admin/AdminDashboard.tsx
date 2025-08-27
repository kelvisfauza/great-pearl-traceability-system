
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Settings, BarChart3, UserCog, Eye } from 'lucide-react';
import UserRegistrationRequests from '@/components/UserRegistrationRequests';
import DeletionRequestsManager from './DeletionRequestsManager';
import MoneyRequestsFinalApproval from './MoneyRequestsFinalApproval';
import { WithdrawalProcessingManager } from './WithdrawalProcessingManager';
import RoleAssignmentManager from './RoleAssignmentManager';
import CashManagementModal from './CashManagementModal';
import UserPresencePanel from './UserPresencePanel';
import CreateTrainingAccountButton from './CreateTrainingAccountButton';
import QuickEmployeeUpdate from './QuickEmployeeUpdate';
import UnifiedPermissionManager from './UnifiedPermissionManager';
import PermissionOverview from './PermissionOverview';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCashModal, setShowCashModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Administrator Dashboard</h1>
          <p className="text-muted-foreground">Manage users, permissions, and system settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PermissionOverview />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <UnifiedPermissionManager />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Registration Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <UserRegistrationRequests />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <QuickEmployeeUpdate />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Presence & Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <UserPresencePanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Money Requests - Final Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <MoneyRequestsFinalApproval />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <WithdrawalProcessingManager />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Deletion Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <DeletionRequestsManager />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <RoleAssignmentManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowCashModal(true)} className="w-full">
                  Add Cash/Float
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <CreateTrainingAccountButton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CashManagementModal
        open={showCashModal}
        onClose={() => setShowCashModal(false)}
      />
    </div>
  );
};

export default AdminDashboard;
