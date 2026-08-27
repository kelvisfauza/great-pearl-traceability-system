import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FirebaseMigrationTool from "@/components/admin/FirebaseMigrationTool";
import SuperAdminCreator from "@/components/admin/SuperAdminCreator";
import MessagingSettings from "@/components/admin/MessagingSettings";
import WalletFreezeManager from "@/components/admin/WalletFreezeManager";
import OverdraftUsageRules from "@/components/admin/OverdraftUsageRules";
import LoanPolicySettings from "@/components/admin/LoanPolicySettings";
import UnifiedPermissionManager from "@/components/admin/UnifiedPermissionManager";
import AdminWalletOperations from "@/components/admin/AdminWalletOperations";
import ProviderSettings from "@/components/admin/ProviderSettings";
import SecuritySettings from "@/components/admin/SecuritySettings";
import UserPermissionsList from "@/components/admin/UserPermissionsList";
import RoleAssignmentManager from "@/components/admin/RoleAssignmentManager";
import QuickPermissionAssignment from "@/components/admin/QuickPermissionAssignment";
import PermissionOverview from "@/components/admin/PermissionOverview";
import { PermissionChangeApprovals } from "@/components/admin/PermissionChangeApprovals";
import AccountStatusManager from "@/components/admin/AccountStatusManager";
import DeletionRequestsManager from "@/components/admin/DeletionRequestsManager";
import { DatabaseCleanupTool } from "@/components/admin/DatabaseCleanupTool";
import { DataArchiveManager } from "@/components/admin/DataArchiveManager";
import MaintenanceToggle from "@/components/it/MaintenanceToggle";
import ScheduledDowntimeSettings from "@/components/it/ScheduledDowntimeSettings";
import BackupManagement from "@/components/it/BackupManagement";
import { Database, Settings, Shield, MessageSquare, Snowflake, ShieldAlert, KeyRound, Wallet, Smartphone, Users, UserX, Wrench, HardDrive, Banknote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MigrateSupplierCodesButton } from "@/components/suppliers/MigrateSupplierCodesButton";
import { MigrateBatchNumbersButton } from "@/components/admin/MigrateBatchNumbersButton";

const SystemSettings = () => {
  return (
    <Layout
      title="System Settings"
      subtitle="Configure system-wide settings and perform administrative tasks"
    >
      <Tabs defaultValue="permissions" className="space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <TabsList className="inline-flex w-auto min-w-full flex-nowrap">
          <TabsTrigger value="permissions" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="user-access" className="gap-2">
            <Users className="h-4 w-4" />
            User Access
          </TabsTrigger>
          <TabsTrigger value="user-accounts" className="gap-2">
            <UserX className="h-4 w-4" />
            Users &amp; Deletions
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="messaging" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Messaging
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="wallet-ops" className="gap-2">
            <Wallet className="h-4 w-4" />
            Wallet Ops
          </TabsTrigger>
          <TabsTrigger value="wallet" className="gap-2">
            <Snowflake className="h-4 w-4" />
            Wallet Freeze
          </TabsTrigger>
          <TabsTrigger value="overdraft" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Overdraft Rules
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2">
            <Banknote className="h-4 w-4" />
            Loan Policy
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2">
            <Database className="h-4 w-4" />
            Data Migration
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="permissions" className="space-y-4">
          <UnifiedPermissionManager />
        </TabsContent>

        <TabsContent value="user-access" className="space-y-6">
          <PermissionChangeApprovals />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <UserPermissionsList />
              <PermissionOverview />
            </div>
            <div className="space-y-6">
              <QuickPermissionAssignment />
              <RoleAssignmentManager />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="user-accounts" className="space-y-6">
          <AccountStatusManager />
          <EmployeeSuspensionManager />
          <DeletionRequestsManager />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceToggle />
          <ScheduledDowntimeSettings />
          <DatabaseCleanupTool />
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <BackupManagement />
          <DataArchiveManager />
        </TabsContent>

        <TabsContent value="messaging" className="space-y-4">
          <MessagingSettings />
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <ProviderSettings />
        </TabsContent>

        <TabsContent value="wallet-ops" className="space-y-4">
          <AdminWalletOperations />
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <WalletFreezeManager />
        </TabsContent>

        <TabsContent value="overdraft" className="space-y-4">
          <OverdraftUsageRules />
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <LoanPolicySettings />
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Code Migration</CardTitle>
              <CardDescription>
                Update all supplier codes to the new sequential format (GPC 00001, GPC 00002, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MigrateSupplierCodesButton />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Batch Number Migration</CardTitle>
              <CardDescription>
                Convert all batch numbers to the new format (YYYYMMDD001). 
                Sequence resets daily: 20250203001, 20250203002, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MigrateBatchNumbersButton />
            </CardContent>
          </Card>
          <FirebaseMigrationTool />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <SuperAdminCreator />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default SystemSettings;