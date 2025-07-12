
import Layout from "@/components/Layout";
import DashboardStats from "@/components/DashboardStats";
import RecentActivity from "@/components/RecentActivity";
import QuickActions from "@/components/QuickActions";
import ApprovalRequests from "@/components/ApprovalRequests";
import PerformanceOverview from "@/components/PerformanceOverview";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { employee, hasRole, hasPermission } = useAuth();

  // Check if user should see management/admin content
  const canViewManagementContent = hasRole("Administrator") || hasRole("Manager") || 
    hasRole("Operations Manager") || hasRole("Supervisor") || hasRole("Company Head");

  // Check if user should see approval requests
  const canViewApprovalRequests = hasRole("Administrator") || hasRole("Operations Manager") || 
    hasRole("Supervisor") || hasRole("Company Head");

  // Check if user should see performance overview
  const canViewPerformanceOverview = hasRole("Administrator") || hasRole("Manager") || 
    hasRole("Operations Manager") || hasRole("Supervisor") || hasRole("Company Head");

  return (
    <Layout 
      title={`Welcome back, ${employee?.name || 'User'}!`}
      subtitle="Here's what's happening at Great Pearl Coffee Factory today."
    >
      <div className="space-y-8">
        {/* Dashboard Stats - visible to everyone */}
        <DashboardStats />

        {/* Approval Requests - only for management roles */}
        {canViewApprovalRequests && <ApprovalRequests />}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity - visible to management roles */}
          {canViewManagementContent && <RecentActivity />}

          {/* Quick Actions - visible to everyone but filtered by role */}
          <QuickActions />
        </div>

        {/* Performance Overview - only for management roles */}
        {canViewPerformanceOverview && <PerformanceOverview />}
      </div>
    </Layout>
  );
};

export default Index;
