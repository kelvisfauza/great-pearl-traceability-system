
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign, Users, Settings, FileText, Shield, UserPlus } from 'lucide-react';
import CashManagementModal from './CashManagementModal';
import DeletionRequestsManager from './DeletionRequestsManager';
import ApprovalRequests from '@/components/ApprovalRequests';
import EUDRSummaryCard from '@/components/store/EUDRSummaryCard';
import RoleAssignmentManager from './RoleAssignmentManager';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';

const AdminDashboard = () => {
  const [showCashModal, setShowCashModal] = useState(false);
  const roleData = useRoleBasedData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Cash Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cash Management
            </CardTitle>
            <CardDescription>
              Add cash or float to finance department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowCashModal(true)}
              className="w-full"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Cash/Float
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage employee accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </CardContent>
        </Card>

        {/* System Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              System Reports
            </CardTitle>
            <CardDescription>
              Generate administrative reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </CardContent>
        </Card>

        {/* Security & Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Access
            </CardTitle>
            <CardDescription>
              Manage system security and access controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Security Settings
            </Button>
          </CardContent>
        </Card>

        {/* Role Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Role Assignment
            </CardTitle>
            <CardDescription>
              Assign approval powers to other users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Manage Roles
            </Button>
          </CardContent>
        </Card>

        {/* EUDR Summary */}
        <EUDRSummaryCard />
      </div>

      {/* Approval Requests Section - Admin Only */}
      {roleData?.isAdmin && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Pending Approval Requests</h3>
          <ApprovalRequests />
        </div>
      )}

      {/* Deletion Requests Section - Admin Only */}
      {roleData?.isAdmin && <DeletionRequestsManager />}

      {/* Role Assignment Section - Admin Only */}
      {roleData?.isAdmin && <RoleAssignmentManager />}

      <CashManagementModal 
        open={showCashModal}
        onClose={() => setShowCashModal(false)}
      />
    </div>
  );
};

export default AdminDashboard;
