import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock, 
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
import { useErrorReporting, SystemError } from '@/hooks/useErrorReporting';
import { useAuth } from '@/contexts/AuthContext';

const ErrorDashboard = () => {
  const { errors, loading, updateErrorStatus, fetchErrors } = useErrorReporting();
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { employee } = useAuth();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-600" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'investigating': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
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

  const handleViewDetails = (error: SystemError) => {
    setSelectedError(error);
    setDetailsModalOpen(true);
  };

  const handleStatusUpdate = async (errorId: string, status: SystemError['status']) => {
    await updateErrorStatus(errorId, status, employee?.name);
  };

  const openErrors = errors.filter(error => error.status === 'open');
  const investigatingErrors = errors.filter(error => error.status === 'investigating');
  const resolvedErrors = errors.filter(error => error.status === 'resolved');

  const criticalErrors = errors.filter(error => error.severity === 'critical' && error.status !== 'resolved');
  const recentErrors = errors.slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Critical Alerts */}
      {criticalErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Issues Requiring Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalErrors.map((error) => (
                <div key={error.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(error.errorType)}
                    <span className="font-medium">{error.title}</span>
                    <Badge className={getSeverityColor(error.severity)}>
                      {error.severity}
                    </Badge>
                  </div>
                  <Button onClick={() => handleViewDetails(error)} size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Fix Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{openErrors.length}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investigating</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{investigatingErrors.length}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {resolvedErrors.filter(error => 
                new Date(error.resolvedAt || '').toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Fixed today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{criticalErrors.length}</div>
            <p className="text-xs text-muted-foreground">Needs immediate fix</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Lists */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="open">Open ({openErrors.length})</TabsTrigger>
          <TabsTrigger value="investigating">Investigating ({investigatingErrors.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedErrors.length})</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="space-y-4">
          {openErrors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Open Errors</h3>
                <p className="text-muted-foreground">All systems are running smoothly!</p>
              </CardContent>
            </Card>
          ) : (
            openErrors.map((error) => (
              <Card key={error.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(error.errorType)}
                        <CardTitle className="text-lg">{error.title}</CardTitle>
                        <Badge className={getSeverityColor(error.severity)}>
                          {getSeverityIcon(error.severity)}
                          {error.severity}
                        </Badge>
                      </div>
                      <CardDescription>{error.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(error.status)}>
                      {error.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Component:</span> {error.component} • 
                      <span className="font-medium"> Time:</span> {new Date(error.timestamp).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleViewDetails(error)} 
                        variant="outline" 
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View & Fix
                      </Button>
                      <Button 
                        onClick={() => handleStatusUpdate(error.id, 'investigating')} 
                        size="sm"
                      >
                        Start Investigation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="investigating" className="space-y-4">
          {investigatingErrors.map((error) => (
            <Card key={error.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(error.errorType)}
                      <CardTitle className="text-lg">{error.title}</CardTitle>
                      <Badge className={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                    </div>
                    <CardDescription>{error.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(error.status)}>
                    <Clock className="h-3 w-3 mr-1" />
                    {error.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Component: {error.component} • {new Date(error.timestamp).toLocaleString()}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleViewDetails(error)} 
                      variant="outline" 
                      size="sm"
                    >
                      View Details
                    </Button>
                    <Button 
                      onClick={() => handleStatusUpdate(error.id, 'resolved')} 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="resolved" className="space-y-4">
          {resolvedErrors.slice(0, 20).map((error) => (
            <Card key={error.id} className="opacity-75">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(error.errorType)}
                      <CardTitle className="text-lg">{error.title}</CardTitle>
                      <Badge className={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                    </div>
                    <CardDescription>{error.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(error.status)}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Resolved by: {error.resolvedBy} • {error.resolvedAt ? new Date(error.resolvedAt).toLocaleString() : 'N/A'}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="recent" className="space-y-4">
          {recentErrors.map((error) => (
            <Card key={error.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(error.errorType)}
                      <CardTitle className="text-lg">{error.title}</CardTitle>
                      <Badge className={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                    </div>
                    <CardDescription>{error.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(error.status)}>
                    {error.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Component: {error.component} • {new Date(error.timestamp).toLocaleString()}
                  </div>
                  <Button 
                    onClick={() => handleViewDetails(error)} 
                    variant="outline" 
                    size="sm"
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Error Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError && getTypeIcon(selectedError.errorType)}
              Error Details & Fix Recommendations
            </DialogTitle>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-6">
              {/* Error Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Title</p>
                  <p className="text-sm text-muted-foreground">{selectedError.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Severity</p>
                  <Badge className={getSeverityColor(selectedError.severity)}>
                    {getSeverityIcon(selectedError.severity)}
                    {selectedError.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Component</p>
                  <p className="text-sm text-muted-foreground">{selectedError.component}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Error Type</p>
                  <p className="text-sm text-muted-foreground">{selectedError.errorType}</p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {selectedError.description}
                </p>
              </div>

              {/* AI Recommendations */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  AI-Powered Fix Recommendations
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border-l-4 border-blue-500">
                  <pre className="text-sm whitespace-pre-wrap text-blue-800 dark:text-blue-200">
                    {selectedError.recommendation}
                  </pre>
                </div>
              </div>

              {/* Stack Trace */}
              {selectedError.stackTrace && (
                <div>
                  <p className="text-sm font-medium mb-2">Stack Trace</p>
                  <ScrollArea className="h-32 w-full rounded border p-3 bg-muted">
                    <pre className="text-xs">{selectedError.stackTrace}</pre>
                  </ScrollArea>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {selectedError.status === 'open' && (
                  <Button 
                    onClick={() => {
                      handleStatusUpdate(selectedError.id, 'investigating');
                      setDetailsModalOpen(false);
                    }}
                  >
                    Start Investigation
                  </Button>
                )}
                {selectedError.status === 'investigating' && (
                  <Button 
                    onClick={() => {
                      handleStatusUpdate(selectedError.id, 'resolved');
                      setDetailsModalOpen(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark as Resolved
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrorDashboard;