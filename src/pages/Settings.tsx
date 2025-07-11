
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, User, Shield, Bell, Database, Wifi, Key } from "lucide-react";
import { useState } from "react";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");

  const systemSettings = [
    { category: "General", icon: SettingsIcon, color: "text-gray-600" },
    { category: "Users", icon: User, color: "text-blue-600" },
    { category: "Security", icon: Shield, color: "text-green-600" },
    { category: "Notifications", icon: Bell, color: "text-yellow-600" },
    { category: "Database", icon: Database, color: "text-purple-600" },
    { category: "Network", icon: Wifi, color: "text-indigo-600" },
  ];

  const users = [
    { id: 1, name: "John Mbale", email: "john@greatpearl.com", role: "Administrator", status: "Active", lastLogin: "2 hours ago" },
    { id: 2, name: "Sarah Nakato", email: "sarah@greatpearl.com", role: "Manager", status: "Active", lastLogin: "1 day ago" },
    { id: 3, name: "Peter Asiimwe", email: "peter@greatpearl.com", role: "User", status: "Active", lastLogin: "3 hours ago" },
    { id: 4, name: "Mary Nalubega", email: "mary@greatpearl.com", role: "User", status: "Inactive", lastLogin: "1 week ago" },
  ];

  const securitySettings = [
    { setting: "Two-Factor Authentication", status: "Enabled", description: "Extra layer of security for user accounts" },
    { setting: "Password Policy", status: "Active", description: "Minimum 8 characters with special characters required" },
    { setting: "Session Timeout", status: "30 minutes", description: "Automatic logout after inactivity" },
    { setting: "IP Whitelist", status: "Disabled", description: "Restrict access to specific IP addresses" },
  ];

  const systemInfo = [
    { label: "System Version", value: "v2.1.4" },
    { label: "Database", value: "PostgreSQL 14.2" },
    { label: "Server", value: "Ubuntu 20.04 LTS" },
    { label: "Last Backup", value: "2 hours ago" },
    { label: "Uptime", value: "15 days, 8 hours" },
    { label: "Storage Used", value: "45.2 GB / 100 GB" },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Basic company details and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <Input defaultValue="Great Pearl Coffee Factory" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contact Email</label>
              <Input defaultValue="info@greatpearl.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <Input defaultValue="+256 414 123456" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input defaultValue="Kampala, Uganda" />
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Current system status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemInfo.map((info, index) => (
              <div key={index} className="flex justify-between py-2 border-b last:border-b-0">
                <span className="font-medium">{info.label}:</span>
                <span className="text-gray-600">{info.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderUserSettings = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage system users and their permissions</CardDescription>
          </div>
          <Button>
            <User className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400">Last login: {user.lastLogin}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{user.role}</Badge>
                <Badge variant={user.status === "Active" ? "default" : "secondary"}>
                  {user.status}
                </Badge>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Security Configuration</CardTitle>
        <CardDescription>Manage system security settings and policies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {securitySettings.map((setting, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{setting.setting}</p>
                <p className="text-sm text-gray-500">{setting.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={setting.status === "Enabled" || setting.status === "Active" ? "default" : "secondary"}>
                  {setting.status}
                </Badge>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return renderUserSettings();
      case "security":
        return renderSecuritySettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <Layout 
      title="System Settings" 
      subtitle="Configure system preferences and user permissions"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>System configuration options</CardDescription>
          </CardHeader>
          <CardContent>
            <nav className="space-y-2">
              {systemSettings.map((setting, index) => (
                <Button
                  key={index}
                  variant={activeTab === setting.category.toLowerCase() ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(setting.category.toLowerCase())}
                >
                  <setting.icon className={`h-4 w-4 mr-3 ${setting.color}`} />
                  {setting.category}
                </Button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
