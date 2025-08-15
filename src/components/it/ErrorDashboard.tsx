import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useErrorReporting, SystemError } from '@/hooks/useErrorReporting';
import { useToast } from '@/hooks/use-toast';
import { AutoFixSystem } from './AutoFixSystem';
import { ITAuthorizationPanel } from './ITAuthorizationPanel';
import { 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  RefreshCw,
  Database,
  Wifi,
  Shield,
  Settings,
  FileX,
  Zap,
  Monitor
} from 'lucide-react';

interface ErrorCardProps {
  error: SystemError;
  onStatusUpdate: (errorId: string, status: SystemError['status'], resolvedBy?: string) => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error, onStatusUpdate }) => {
  const { toast } = useToast();

  const handleStatusUpdate = async (status: SystemError['status']) => {
    await onStatusUpdate(error.id, status, 'IT Department');
    toast({
      title: "Status Updated",
      description: `Error marked as ${status}`
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'network': return <Wifi className="h-4 w-4" />;
      case 'authentication': return <Shield className="h-4 w-4" />;
      case 'permission': return <Shield className="h-4 w-4" />;
      case 'workflow': return <Settings className="h-4 w-4" />;
      case 'validation': return <FileX className="h-4 w-4" />;
      case 'system': return <Monitor className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <Card key={error.id} className={error.severity === 'critical' ? 'border-red-500' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getTypeIcon(error.errorType)}
              <CardTitle className="text-lg">{error.title}</CardTitle>
              <Badge variant={getSeverityColor(error.severity)}>
                {error.severity}
              </Badge>
            </div>
            <CardDescription>{error.description}</CardDescription>
          </div>
          <Badge variant={error.status === 'resolved' ? 'default' : 'secondary'}>
            {error.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Component:</span> {error.component} • 
            <span className="font-medium"> Time:</span> {new Date(error.timestamp).toLocaleString()}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-500">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Fix Recommendation:
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
              {error.recommendation}
            </p>
          </div>

          <div className="flex gap-2">
            {error.status === 'open' && (
              <Button 
                onClick={() => handleStatusUpdate('investigating')} 
                size="sm"
              >
                Start Investigation
              </Button>
            )}
            {error.status === 'investigating' && (
              <Button 
                onClick={() => handleStatusUpdate('resolved')} 
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ErrorDashboard = () => {
  const { errors, loading, updateErrorStatus, fetchErrors } = useErrorReporting();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Filter errors based on search and filters
  const filteredErrors = errors.filter(error => {
    const matchesSearch = error.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || error.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || error.status === filterStatus;
    const matchesType = filterType === 'all' || error.errorType === filterType;
    
    return matchesSearch && matchesSeverity && matchesStatus && matchesType;
  });

  // Statistics
  const criticalErrors = errors.filter(e => e.severity === 'critical' && e.status !== 'resolved').length;
  const highErrors = errors.filter(e => e.severity === 'high' && e.status !== 'resolved').length;
  const mediumErrors = errors.filter(e => e.severity === 'medium' && e.status !== 'resolved').length;
  const resolvedErrors = errors.filter(e => e.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Error Dashboard</TabsTrigger>
          <TabsTrigger value="autofix">Auto-Fix System</TabsTrigger>
          <TabsTrigger value="authority">IT Authority</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">System Error Dashboard</h2>
              <p className="text-muted-foreground">
                Monitor and resolve system errors with AI-powered recommendations
              </p>
            </div>
            <Button onClick={fetchErrors} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-500">{criticalErrors}</p>
                    <p className="text-sm text-muted-foreground">Critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-orange-500">{highErrors}</p>
                    <p className="text-sm text-muted-foreground">High</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-500">{mediumErrors}</p>
                    <p className="text-sm text-muted-foreground">Medium</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-500">{resolvedErrors}</p>
                    <p className="text-sm text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Error Management</CardTitle>
              <CardDescription>Filter and manage system errors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Input
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="permission">Permission</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          <Card>
            <CardHeader>
              <CardTitle>System Errors ({filteredErrors.length})</CardTitle>
              <CardDescription>
                Real-time error tracking and resolution management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading errors...</div>
              ) : filteredErrors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {errors.length === 0 ? 'No errors found. System is healthy!' : 'No errors match the current filters.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredErrors.map((error) => (
                    <ErrorCard 
                      key={error.id} 
                      error={error} 
                      onStatusUpdate={updateErrorStatus}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autofix" className="space-y-6">
          <AutoFixSystem 
            errors={errors} 
            onErrorUpdate={updateErrorStatus}
          />
        </TabsContent>

        <TabsContent value="authority" className="space-y-6">
          <ITAuthorizationPanel />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>Real-time system health and performance monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Advanced monitoring dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ErrorDashboard;