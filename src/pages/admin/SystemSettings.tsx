import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FirebaseMigrationTool from "@/components/admin/FirebaseMigrationTool";
import SuperAdminCreator from "@/components/admin/SuperAdminCreator";
import MessagingSettings from "@/components/admin/MessagingSettings";
import { Database, Settings, Shield, MessageSquare } from "lucide-react";

const SystemSettings = () => {
  return (
    <Layout
      title="System Settings"
      subtitle="Configure system-wide settings and perform administrative tasks"
    >
      <Tabs defaultValue="messaging" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messaging" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Messaging
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

        <TabsContent value="messaging" className="space-y-4">
          <MessagingSettings />
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <FirebaseMigrationTool />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <SuperAdminCreator />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="text-center text-muted-foreground py-8">
            Security settings coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default SystemSettings;