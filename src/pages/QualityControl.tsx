
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const QualityControl = () => {
  const qualityTests = [
    { id: 1, batch: "QB-2024-0145", supplier: "Bushenyi Cooperative", status: "Passed", score: 94, date: "Today" },
    { id: 2, batch: "QB-2024-0144", supplier: "Masaka Traders", status: "Failed", score: 76, date: "Yesterday" },
    { id: 3, batch: "QB-2024-0143", supplier: "Ntungamo Union", status: "Pending", score: null, date: "Today" },
  ];

  const qualityMetrics = [
    { name: "Moisture Content", value: "12.5%", status: "Good", target: "≤13%" },
    { name: "Defect Rate", value: "3.2%", status: "Excellent", target: "≤5%" },
    { name: "Bean Size", value: "Screen 15+", status: "Good", target: "Screen 14+" },
    { name: "Acidity Level", value: "4.8", status: "Excellent", target: "4.5-5.5" },
  ];

  return (
    <Layout 
      title="Quality Control" 
      subtitle="Monitor and maintain coffee quality standards"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Quality Score</p>
                  <p className="text-2xl font-bold">94.2%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tests Today</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed Batches</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Tests</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quality Tests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Quality Tests</CardTitle>
                  <CardDescription>Latest batch quality assessments</CardDescription>
                </div>
                <Button>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  New Test
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityTests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Batch {test.batch}</p>
                      <p className="text-sm text-gray-500">{test.supplier}</p>
                      <p className="text-xs text-gray-400">{test.date}</p>
                    </div>
                    <div className="text-right">
                      {test.score && <p className="font-bold text-lg">{test.score}%</p>}
                      <Badge variant={
                        test.status === "Passed" ? "default" : 
                        test.status === "Failed" ? "destructive" : "secondary"
                      }>
                        {test.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
              <CardDescription>Current quality parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      <p className="text-sm text-gray-500">Target: {metric.target}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{metric.value}</p>
                      <Badge variant={
                        metric.status === "Excellent" ? "default" : 
                        metric.status === "Good" ? "secondary" : "destructive"
                      }>
                        {metric.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default QualityControl;
