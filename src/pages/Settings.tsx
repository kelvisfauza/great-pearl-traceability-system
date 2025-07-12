
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import UserProfile from "@/components/settings/UserProfile";

const Settings = () => {
  const { employee } = useAuth();

  if (!employee) {
    return (
      <Layout title="Settings" subtitle="User settings and preferences">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to access settings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Settings" 
      subtitle="Manage your profile and account preferences"
    >
      <UserProfile />
    </Layout>
  );
};

export default Settings;
