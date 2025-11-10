import Layout from "@/components/Layout";
import ReportGenerator from "@/components/reports/ReportGenerator";
import PrintReportGenerator from "@/components/reports/PrintReportGenerator";
import RecentReports from "@/components/reports/RecentReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GenerateReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Report Generator" 
      subtitle="Create and manage custom reports"
    >
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/reports")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Generator</CardTitle>
              <CardDescription>Create custom reports with your preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportGenerator />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Print Reports</CardTitle>
              <CardDescription>Generate print-ready report formats</CardDescription>
            </CardHeader>
            <CardContent>
              <PrintReportGenerator />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>View and manage previously generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentReports />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default GenerateReport;
