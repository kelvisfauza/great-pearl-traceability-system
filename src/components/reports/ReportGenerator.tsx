
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Filter, Download } from 'lucide-react';

interface ReportType {
  id: string;
  name: string;
  description: string;
  category: string;
  lastGenerated: string;
  frequency: string;
  format: string[];
}

const ReportGenerator = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');

  const reportTypes: ReportType[] = [
    { 
      id: '1', 
      name: 'Production Report', 
      description: 'Daily production volumes and efficiency metrics',
      category: 'Operations',
      lastGenerated: '2 hours ago',
      frequency: 'Daily',
      format: ['PDF', 'Excel']
    },
    { 
      id: '2', 
      name: 'Quality Analysis', 
      description: 'Coffee quality scores and defect rates',
      category: 'Quality',
      lastGenerated: '1 day ago',
      frequency: 'Weekly',
      format: ['PDF', 'Excel']
    },
    { 
      id: '3', 
      name: 'Financial Summary', 
      description: 'Revenue, expenses, and profit analysis',
      category: 'Finance',
      lastGenerated: '3 hours ago',
      frequency: 'Monthly',
      format: ['PDF', 'Excel', 'CSV']
    },
    { 
      id: '4', 
      name: 'Supplier Performance', 
      description: 'Supplier delivery times and quality metrics',
      category: 'Procurement',
      lastGenerated: '5 hours ago',
      frequency: 'Weekly',
      format: ['PDF', 'Excel']
    },
    { 
      id: '5', 
      name: 'Inventory Status', 
      description: 'Stock levels and turnover analysis',
      category: 'Inventory',
      lastGenerated: '1 hour ago',
      frequency: 'Daily',
      format: ['PDF', 'Excel', 'CSV']
    },
    { 
      id: '6', 
      name: 'Sales Performance', 
      description: 'Sales trends and customer analysis',
      category: 'Sales',
      lastGenerated: '4 hours ago',
      frequency: 'Weekly',
      format: ['PDF', 'Excel']
    }
  ];

  const categories = ['all', 'Operations', 'Quality', 'Finance', 'Procurement', 'Inventory', 'Sales'];

  const filteredReports = selectedCategory === 'all' 
    ? reportTypes 
    : reportTypes.filter(report => report.category === selectedCategory);

  const handleGenerateReport = (reportId: string, format: string) => {
    console.log(`Generating report ${reportId} in ${format} format`);
    // Here you would typically call an API to generate the report
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Generator
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{report.name}</p>
                      <Badge variant="secondary">{report.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Frequency: {report.frequency}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Last: {report.lastGenerated}
                      </span>
                      <div className="flex gap-1">
                        {report.format.map((fmt) => (
                          <Badge key={fmt} variant="outline" className="text-xs">
                            {fmt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => handleGenerateReport(report.id, selectedFormat)}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;
