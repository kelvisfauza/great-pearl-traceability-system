
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Search, Eye, Trash2, RefreshCw } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
  status: 'Ready' | 'Processing' | 'Failed';
  downloads: number;
  format: string;
}

const RecentReports = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const reports: Report[] = [
    { 
      id: '1',
      name: 'December Production Summary', 
      type: 'Production', 
      date: 'Jan 2, 2025', 
      size: '2.3 MB', 
      status: 'Ready',
      downloads: 12,
      format: 'PDF'
    },
    { 
      id: '2',
      name: 'Q4 Financial Report', 
      type: 'Finance', 
      date: 'Jan 1, 2025', 
      size: '1.8 MB', 
      status: 'Ready',
      downloads: 8,
      format: 'Excel'
    },
    { 
      id: '3',
      name: 'Weekly Quality Report - W52', 
      type: 'Quality', 
      date: 'Dec 30, 2024', 
      size: '945 KB', 
      status: 'Ready',
      downloads: 15,
      format: 'PDF'
    },
    { 
      id: '4',
      name: 'Supplier Performance - December', 
      type: 'Procurement', 
      date: 'Dec 29, 2024', 
      size: '1.2 MB', 
      status: 'Processing',
      downloads: 0,
      format: 'Excel'
    },
    { 
      id: '5',
      name: 'Inventory Analysis Report', 
      type: 'Inventory', 
      date: 'Dec 28, 2024', 
      size: '856 KB', 
      status: 'Failed',
      downloads: 0,
      format: 'PDF'
    },
    { 
      id: '6',
      name: 'Sales Performance - November', 
      type: 'Sales', 
      date: 'Dec 1, 2024', 
      size: '1.5 MB', 
      status: 'Ready',
      downloads: 22,
      format: 'Excel'
    }
  ];

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'default';
      case 'Processing': return 'secondary';
      case 'Failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleDownload = (reportId: string) => {
    console.log(`Downloading report ${reportId}`);
    // Implement download logic
  };

  const handlePreview = (reportId: string) => {
    console.log(`Previewing report ${reportId}`);
    // Implement preview logic
  };

  const handleDelete = (reportId: string) => {
    console.log(`Deleting report ${reportId}`);
    // Implement delete logic
  };

  const handleRegenerate = (reportId: string) => {
    console.log(`Regenerating report ${reportId}`);
    // Implement regenerate logic
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Reports ({filteredReports.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-48"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Ready">Ready</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Quality">Quality</SelectItem>
                <SelectItem value="Procurement">Procurement</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{report.name}</p>
                    <Badge variant="outline">{report.format}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {report.type} • {report.date} • {report.size}
                  </p>
                  {report.downloads > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Downloaded {report.downloads} times
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={getStatusColor(report.status) as any}>
                  {report.status}
                </Badge>
                <div className="flex space-x-1">
                  {report.status === 'Ready' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handlePreview(report.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(report.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {report.status === 'Failed' && (
                    <Button variant="outline" size="sm" onClick={() => handleRegenerate(report.id)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleDelete(report.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredReports.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reports found matching your criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentReports;
