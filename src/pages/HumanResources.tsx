
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const HumanResources = () => {
  return (
    <Layout 
      title="Human Resources" 
      subtitle="Manage staff, payroll, and organizational structure"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-green-600" />
            Human Resources Dashboard
          </CardTitle>
          <CardDescription>
            HR management features coming soon...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This section will include employee management, payroll, performance tracking, and organizational charts.</p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default HumanResources;
