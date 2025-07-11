
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const FieldOperations = () => {
  return (
    <Layout 
      title="Field Operations" 
      subtitle="Manage field agents, buying stations, and rural operations"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-green-600" />
            Field Operations Dashboard
          </CardTitle>
          <CardDescription>
            Field management features coming soon...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This section will include field agent management, buying station operations, and rural sourcing activities.</p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default FieldOperations;
