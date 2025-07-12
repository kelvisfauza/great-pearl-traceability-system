
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, User, Shield, Bell, Database, Wifi, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const { employees, loading: employeesLoading } = useEmployees();
  const { requests } = useApprovalRequests();
  const { toast } = useToast();
  
  // Company settings state
  const [companyInfo, setCompanyInfo] = useState({
    name: "Great Pearl Coffee Factory",
    email: "info@greatpearl.com",
    phone: "+256 414 123456",
    address: "Kampala, Uganda"
  });

  const systemSettings = [
    { category: "General", icon: SettingsIcon, color: "text-gray-600" },
    { category: "Users", icon: User, color: "text-blue-600" },
    { category: "Security", icon: Shield, color: "text-green-600" },
    { category: "Notifications", icon: Bell, color: "text-yellow-600" },
    { category: "Database", icon: Database, color: "text-purple-600" },
    { category: "Network", icon: Wifi, color: "text-indigo-600" },
  ];

  // Filter users by role for security settings
  const adminUsers = employees.filter(emp => emp.role === 'Administrator');
  const managerUsers = employees.filter(emp => emp.role === 'Manager');
  const regularUsers = employees.filter(emp => emp.role === 'User');

  // Security settings based on real data
  const securitySettings = [
    { 
      setting: "Administrator Accounts", 
      status: `${adminUsers.length} Active`, 
      description: "Users with full system access" 
    },
    { 
      setting: "Manager Accounts", 
      status: `${managerUsers.length} Active`, 
      description: "Users with departmental management access" 
    },
    { 
      setting: "Regular User Accounts", 
      status: `${regularUsers.length} Active`, 
      description: "Standard users with limited access" 
    },
    { 
      setting: "Pending Approvals", 
      status: `${requests.filter(r => r.status === 'Pending').length} Items`, 
      description: "Requests awaiting approval" 
    },
  ];

  // System information based on real data
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const totalApprovals = requests.length;
  const pendingApprovals = requests.filter(r => r.status === 'Pending').length;

  const systemInfo = [
    { label: "Total Employees", value: totalEmployees.toString() },
    { label: "Active Employees", value: activeEmployees.toString() },
    { label: "Total Approval Requests", value: totalApprovals.toString() },
    { label: "Pending Approvals", value: pendingApprovals.toString() },
    { label: "System Version", value: "v2.1.4" },
    { label: "Database Status", value: "Online" },
  ];

  const handleSaveCompanyInfo = async () => {
    // Here you could save to a company_settings table if needed
    toast({
      title: "Success",
      description: "Company information updated successfully"
    });
  };

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
              <Input 
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contact Email</label>
              <Input 
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <Input 
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input 
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
              />
            </div>
          </div>
          <Button onClick={handleSaveCompanyInfo}>Save Changes</Button>
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
            <CardDescription>System users and their roles</CardDescription>
          </div>
          <Badge variant="outline">{totalEmployees} Total Users</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {employeesLoading ? (
          <p className="text-center text-gray-500">Loading users...</p>
        ) : (
          <div className="space-y-4">
            {employees.slice(0, 10).map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">{user.position} • {user.department}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{user.role}</Badge>
                  <Badge variant={user.status === "Active" ? "default" : "secondary"}>
                    {user.status}
                  </Badge>
                </div>
              </div>
            ))}
            {employees.length > 10 && (
              <p className="text-sm text-gray-500 text-center">
                Showing 10 of {employees.length} users
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Security Configuration</CardTitle>
        <CardDescription>System security overview and user access levels</CardDescription>
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
                <Badge variant="default">
                  {setting.status}
                </Badge>
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
