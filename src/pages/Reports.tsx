
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Reports = () => {
  return (
    <Layout 
      title="Reports & Analytics" 
      subtitle="Generate reports and view business analytics"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-green-600" />
            Reports Dashboard
          </CardTitle>
          <CardDescription>
            Reporting features coming soon...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This section will include financial reports, quality reports, production analytics, and custom dashboards.</p>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Reports;
