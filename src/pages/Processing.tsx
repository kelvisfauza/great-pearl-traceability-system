
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Cog, TrendingUp, Clock } from "lucide-react";

const Processing = () => {
  return (
    <Layout 
      title="Processing Operations" 
      subtitle="Monitor milling, sorting, and production processes"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processed Today</p>
                  <p className="text-2xl font-bold">245 bags</p>
                </div>
                <Coffee className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Machine Efficiency</p>
                  <p className="text-2xl font-bold">87%</p>
                </div>
                <Cog className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Output Rate</p>
                  <p className="text-2xl font-bold">85%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processing Time</p>
                  <p className="text-2xl font-bold">6.2 hrs</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Processing Operations</CardTitle>
            <CardDescription>Coffee milling and sorting processes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Processing management features coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Processing;
