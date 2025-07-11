
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const SalesMarketing = () => {
  return (
    <Layout 
      title="Sales & Marketing" 
      subtitle="Manage sales contracts, customers, and marketing initiatives"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Sales & Marketing Dashboard
          </CardTitle>
          <CardDescription>
            Sales management features coming soon...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This section will include customer management, sales contracts, export tracking, and marketing campaigns.</p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default SalesMarketing;
