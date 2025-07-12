
import Layout from "@/components/Layout";
import DashboardStats from "@/components/DashboardStats";
import RecentActivity from "@/components/RecentActivity";
import QuickActions from "@/components/QuickActions";
import ApprovalRequests from "@/components/ApprovalRequests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <Layout 
      title="Welcome back, John Mbale!" 
      subtitle="Here's what's happening at Great Pearl Coffee Factory today."
    >
      <div className="space-y-8">
        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Approval Requests */}
        <ApprovalRequests />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <RecentActivity />

          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Performance Overview
            </CardTitle>
            <CardDescription>
              Key performance indicators for this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">94%</div>
                <div className="text-sm text-gray-600">Quality Score</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-gray-600">On-Time Delivery</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">87%</div>
                <div className="text-sm text-gray-600">Efficiency Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
