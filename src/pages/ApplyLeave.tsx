import Layout from "@/components/Layout";
import LeaveApplication from "@/components/settings/LeaveApplication";

const ApplyLeave = () => (
  <Layout title="Apply for Leave" subtitle="Request leave and track your applications">
    <div className="max-w-4xl mx-auto">
      <LeaveApplication />
    </div>
  </Layout>
);

export default ApplyLeave;
