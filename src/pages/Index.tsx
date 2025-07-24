
import Layout from "@/components/Layout";
import DashboardStats from "@/components/DashboardStats";
import RecentActivity from "@/components/RecentActivity";
import QuickActions from "@/components/QuickActions";
import ApprovalRequests from "@/components/ApprovalRequests";
import ManagementRequests from "@/components/admin/ManagementRequests";
import PerformanceOverview from "@/components/PerformanceOverview";
import PriceTicker from "@/components/PriceTicker";
import ProtectedContent from "@/components/ProtectedContent";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleBasedAccess } from "@/hooks/useRoleBasedAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Coffee, AlertCircle } from "lucide-react";

const Index = () => {
  const { employee } = useAuth();
  const access = useRoleBasedAccess();

  if (!employee) return null;

  return (
    <Layout 
      title={`Welcome back, ${employee.name}!`}
      subtitle="Your coffee factory management dashboard - track operations, manage tasks, and stay connected."
    >
      <div className="space-y-8">
        {/* Live Market Prices */}
        <PriceTicker />

        {/* Welcome Section with Role-Based Greeting */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
                </h2>
                <p className="text-gray-600 mb-3">
                  You're logged in as <span className="font-semibold">{employee.position}</span> in the {employee.department} department.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {employee.status}
                  </Badge>
                  <Badge variant="outline">
                    {employee.department}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {access.roleLevel}
                  </Badge>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="text-center">
                  <Coffee className="h-8 w-8 text-green-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Coffee Operations</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Stats */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Key Metrics</h3>
          </div>
          <DashboardStats />
        </div>

        {/* Management Requests - Only for those who can approve */}
        {access.canApproveRequests && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-1">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">Employee Requests for Approval</h3>
              <Badge variant="destructive" className="ml-2">Requires Action</Badge>
            </div>
            <ManagementRequests />
          </div>
        )}

        {/* Legacy Approval Requests - Only for those who can approve */}
        {access.canApproveRequests && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-1">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Legacy Approval Requests</h3>
            </div>
            <ApprovalRequests />
          </div>
        )}

        {/* Main Dashboard Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions (Always Visible) */}
          <div className="xl:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <QuickActions />
          </div>

          {/* Right Column - Recent Activity (Management Only) */}
          <ProtectedContent 
            requiredRole="Manager"
            showAccessDenied={false}
            fallback={
              <div className="xl:col-span-2">
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Users className="h-5 w-5" />
                      Need Help or Support?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-700 mb-4">
                      For assistance with your tasks or if you need access to additional features, 
                      please contact your supervisor or the IT department.
                    </p>
                    <div className="flex gap-3">
                      <Badge variant="secondary">Department: {employee.department}</Badge>
                      <Badge variant="secondary">Role: {employee.position}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            }
          >
            <div className="xl:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <Badge variant="secondary" className="ml-2">Live Updates</Badge>
              </div>
              <RecentActivity />
            </div>
          </ProtectedContent>
        </div>

        {/* Performance Overview - Management Only */}
        <ProtectedContent requiredRole="Manager" showAccessDenied={false}>
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
              </div>
              <Badge variant="outline">Real-time Data</Badge>
            </div>
            <PerformanceOverview />
          </div>
        </ProtectedContent>

        {/* Footer Information */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Great Pearl Coffee Factory</span>
                <span>•</span>
                <span>Dashboard v2.0</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
