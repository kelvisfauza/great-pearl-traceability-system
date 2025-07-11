
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, BarChart3, TrendingUp, Download, Calendar, Filter } from "lucide-react";
import { useState } from "react";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("This Month");

  const reportTypes = [
    { 
      id: 1, 
      name: "Production Report", 
      description: "Daily production volumes and efficiency metrics",
      category: "Operations",
      lastGenerated: "2 hours ago",
      frequency: "Daily"
    },
    { 
      id: 2, 
      name: "Quality Analysis", 
      description: "Coffee quality scores and defect rates",
      category: "Quality",
      lastGenerated: "1 day ago",
      frequency: "Weekly"
    },
    { 
      id: 3, 
      name: "Financial Summary", 
      description: "Revenue, expenses, and profit analysis",
      category: "Finance",
      lastGenerated: "3 hours ago",
      frequency: "Monthly"
    },
    { 
      id: 4, 
      name: "Supplier Performance", 
      description: "Supplier delivery times and quality metrics",
      category: "Procurement",
      lastGenerated: "5 hours ago",
      frequency: "Weekly"
    },
    { 
      id: 5, 
      name: "Inventory Status", 
      description: "Stock levels and turnover analysis",
      category: "Inventory",
      lastGenerated: "1 hour ago",
      frequency: "Daily"
    },
    { 
      id: 6, 
      name: "Sales Performance", 
      description: "Sales trends and customer analysis",
      category: "Sales",
      lastGenerated: "4 hours ago",
      frequency: "Weekly"
    }
  ];

  const keyMetrics = [
    { label: "Total Production", value: "2,847 bags", change: "+12.5%", trend: "up" },
    { label: "Quality Score", value: "94.2%", change: "+2.1%", trend: "up" },
    { label: "Revenue", value: "UGX 847M", change: "+8.7%", trend: "up" },
    { label: "Customer Satisfaction", value: "96.8%", change: "+1.2%", trend: "up" },
  ];

  const recentReports = [
    { name: "December Production Summary", type: "Production", date: "Jan 2, 2025", size: "2.3 MB", status: "Ready" },
    { name: "Q4 Financial Report", type: "Finance", date: "Jan 1, 2025", size: "1.8 MB", status: "Ready" },
    { name: "Weekly Quality Report - W52", type: "Quality", date: "Dec 30, 2024", size: "945 KB", status: "Ready" },
    { name: "Supplier Performance - December", type: "Procurement", date: "Dec 29, 2024", size: "1.2 MB", status: "Ready" },
  ];

  const dashboardData = [
    { category: "Production", value: 2847, target: 3000, percentage: 94.9 },
    { category: "Quality", value: 94.2, target: 95, percentage: 99.2 },
    { category: "Sales", value: 847, target: 900, percentage: 94.1 },
    { category: "Efficiency", value: 87.3, target: 90, percentage: 97.0 },
  ];

  return (
    <Layout 
      title="Reports & Analytics" 
      subtitle="Generate reports and view business analytics"
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {keyMetrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <p className={`text-xs ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change} from last period
                    </p>
                  </div>
                  <TrendingUp className={`h-8 w-8 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Generator */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generate Reports</CardTitle>
                  <CardDescription>Create custom reports for different business areas</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {selectedPeriod}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportTypes.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <p className="text-sm text-gray-500">{report.description}</p>
                          <p className="text-xs text-gray-400">
                            {report.category} • {report.frequency} • Last: {report.lastGenerated}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      Generate
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Dashboard</CardTitle>
              <CardDescription>Key performance indicators at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dashboardData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-sm text-gray-600">
                        {item.value} / {item.target}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          item.percentage >= 95 ? 'bg-green-500' :
                          item.percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{item.percentage.toFixed(1)}% of target</span>
                      <Badge variant={
                        item.percentage >= 95 ? "default" :
                        item.percentage >= 80 ? "secondary" : "destructive"
                      }>
                        {item.percentage >= 95 ? "Excellent" :
                         item.percentage >= 80 ? "Good" : "Needs Attention"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>Download previously generated reports</CardDescription>
              </div>
              <Button>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReports.map((report, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-gray-500">
                        {report.type} • {report.date} • {report.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">{report.status}</Badge>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
