import Layout from "@/components/Layout";
import EUDRDocumentation from "@/components/store/EUDRDocumentation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

const EUDRDocumentationPage = () => {
  const { hasPermission } = useAuth();

  if (!hasPermission('EUDR Documentation') && !hasPermission('Store Management')) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <FileText className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access EUDR Documentation.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="EUDR Documentation" 
      subtitle="European Union Deforestation Regulation compliance tracking"
    >
      <div className="space-y-6">
        <EUDRDocumentation />
      </div>
    </Layout>
  );
};

export default EUDRDocumentationPage;