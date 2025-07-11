
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";

const Logistics = () => {
  return (
    <Layout 
      title="Logistics Management" 
      subtitle="Manage transportation, shipping, and delivery operations"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2 text-green-600" />
            Logistics Dashboard
          </CardTitle>
          <CardDescription>
            Logistics features coming soon...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This section will include shipment tracking, delivery management, transportation scheduling, and export logistics.</p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Logistics;
