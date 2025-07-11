
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <Layout 
      title="System Settings" 
      subtitle="Configure system preferences and user permissions"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2 text-green-600" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Settings features coming soon...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This section will include user management, system configuration, security settings, and preferences.</p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Settings;
