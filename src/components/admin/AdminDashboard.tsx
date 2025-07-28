
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign, Users, Settings, FileText, Shield } from 'lucide-react';
import CashManagementModal from './CashManagementModal';
import DeletionRequestsManager from './DeletionRequestsManager';

const AdminDashboard = () => {
  const [showCashModal, setShowCashModal] = useState(false);

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
      </div>

      {/* Deletion Requests Section */}
      <DeletionRequestsManager />

      <CashManagementModal 
        open={showCashModal}
        onClose={() => setShowCashModal(false)}
      />
    </div>
  );
};

export default AdminDashboard;
