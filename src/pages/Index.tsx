
import Layout from "@/components/Layout";
import DashboardStats from "@/components/DashboardStats";
import RecentActivity from "@/components/RecentActivity";
import QuickActions from "@/components/QuickActions";
import ApprovalRequests from "@/components/ApprovalRequests";
import PerformanceOverview from "@/components/PerformanceOverview";

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
        <PerformanceOverview />
      </div>
    </Layout>
  );
};

export default Index;
