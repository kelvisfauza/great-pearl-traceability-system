
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import UserManagement from '@/components/settings/UserManagement';
import UserProfile from '@/components/settings/UserProfile';
import QuickEmployeeUpdate from '@/components/admin/QuickEmployeeUpdate';
import PaymentSlipGenerator from '@/components/settings/PaymentSlipGenerator';
import ContractGenerator from '@/components/settings/ContractGenerator';
import { useState } from 'react';
import UserPresencePanel from '@/components/admin/UserPresencePanel';

const Settings = () => {
  const { canManageEmployees, isAdmin, employee } = useAuth();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useFirebaseEmployees();
  const [showPaymentSlipModal, setShowPaymentSlipModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

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
      <div className="p-3 md:p-6 max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage your account settings and system preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="profile" className="text-xs md:text-sm px-2 py-2">Profile</TabsTrigger>
            {canManageEmployees() && (
              <TabsTrigger value="users" className="text-xs md:text-sm px-2 py-2">Users</TabsTrigger>
            )}
            {canManageEmployees() && (
              <TabsTrigger value="documents" className="text-xs md:text-sm px-2 py-2">Docs</TabsTrigger>
            )}
            {isAdmin() && (
              <TabsTrigger value="admin" className="text-xs md:text-sm px-2 py-2">Admin</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            <UserProfile employee={employee} />
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

          {canManageEmployees() && (
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Templates</CardTitle>
                  <CardDescription>Generate and print employee documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 text-sm md:text-base">Payment Slips</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mb-4">
                          Generate salary payment slips with deductions, bonuses, and allowances
                        </p>
                        <Button onClick={() => setShowPaymentSlipModal(true)} size="sm" className="w-full md:w-auto">
                          Generate Payment Slip
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 text-sm md:text-base">Employment Contracts</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mb-4">
                          Create employment contracts with terms and conditions
                        </p>
                        <Button onClick={() => setShowContractModal(true)} size="sm" className="w-full md:w-auto">
                          Generate Contract
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Presence</CardTitle>
                  <CardDescription>See who is online and their last activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserPresencePanel />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Employee Role Update</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuickEmployeeUpdate />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <PaymentSlipGenerator 
          isOpen={showPaymentSlipModal}
          onClose={() => setShowPaymentSlipModal(false)}
        />

        <ContractGenerator 
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
        />
      </div>
    </Layout>
  );
};

export default Settings;
