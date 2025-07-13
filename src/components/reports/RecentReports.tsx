
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Search, Eye, Trash2, RefreshCw } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const RecentReports = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { reports, loading } = useReports();

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
    // Here you would implement actual file download logic
  };

  const handlePreview = (reportId: string) => {
    console.log(`Previewing report ${reportId}`);
    // Implement preview logic
  };

  const handleDelete = async (reportId: string) => {
    console.log(`Deleting report ${reportId}`);
    // Implement delete logic using Firebase
  };

  const handleRegenerate = (reportId: string) => {
    console.log(`Regenerating report ${reportId}`);
    // Implement regenerate logic
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

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
                    {report.type} • {format(new Date(report.created_at), 'MMM d, yyyy')} • {report.file_size || 'N/A'}
                  </p>
                  {report.downloads && report.downloads > 0 && (
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(report.id)}
                  >
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
