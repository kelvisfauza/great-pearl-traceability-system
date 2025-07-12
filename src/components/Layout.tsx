
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Coffee, Bell, Search, LogOut } from "lucide-react";
import RoleBasedNavigation from "./RoleBasedNavigation";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const { employee, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Coffee className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Great Pearl Coffee Factory</h1>
                <p className="text-sm text-gray-500">Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search..." 
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                <Badge variant="destructive" className="ml-2">3</Badge>
              </Button>
              {employee && (
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                    <p className="text-xs text-gray-500">{employee.position}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <RoleBasedNavigation />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {(title || subtitle) && (
              <div className="bg-gradient-to-r from-green-600 to-amber-600 rounded-lg p-6 text-white mb-8">
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                {subtitle && <p className="opacity-90">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
