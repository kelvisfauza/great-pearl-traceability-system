import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Settings,
  Database,
  Server,
  HardDrive,
  Cpu,
  Loader2
} from 'lucide-react';
import { useFirebaseSystemMetrics } from '@/hooks/useFirebaseSystemMetrics';
import { useState } from 'react';

const SystemMaintenance = () => {
  const { metrics, loading, addActivity } = useFirebaseSystemMetrics();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Maintenance action handlers
  const handleMaintenanceAction = async (actionName: string, actionType: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setActionLoading(actionName);
    
    try {
      // Simulate maintenance action with delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Log the activity
      await addActivity({
        action: `${actionName} completed`,
        type: actionType,
        details: `Maintenance action: ${actionName} executed successfully`
      });

      toast({
        title: "Maintenance Complete",
        description: `${actionName} has been completed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Maintenance Failed",
        description: `Failed to complete ${actionName}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'in-progress':
        return <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Impact</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Impact</Badge>;
      default:
        return <Badge variant="secondary">{impact}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Database':
        return <Database className="h-4 w-4" />;
      case 'Security':
        return <Settings className="h-4 w-4" />;
      case 'Hardware':
        return <Server className="h-4 w-4" />;
      case 'Backup':
        return <HardDrive className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'normal':
      case 'healthy':
        return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, color: 'text-green-600' };
      case 'warning':
        return { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, color: 'text-yellow-600' };
      case 'error':
      case 'critical':
        return { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, color: 'text-red-600' };
      default:
        return { icon: <CheckCircle className="h-4 w-4 text-gray-500" />, color: 'text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading maintenance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview - Only show if metrics exist */}
      {metrics.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Health Monitor
            </CardTitle>
            <CardDescription>Real-time system performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {metrics.map((metric) => {
                const healthStatus = getHealthStatus(metric.status);
                return (
                  <div key={metric.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {healthStatus.icon}
                        <h4 className="font-medium">{metric.name}</h4>
                      </div>
                      <span className={`text-sm font-medium ${healthStatus.color}`}>
                        {metric.value}%
                      </span>
                    </div>
                    <Progress value={metric.value} className="mb-2" />
                    <p className="text-xs text-gray-500">
                      Status: {metric.status}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Health Monitor
            </CardTitle>
            <CardDescription>Real-time system performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Cpu className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No System Metrics</h3>
              <p className="text-gray-500 mb-4">No system performance data found in the database.</p>
              <p className="text-sm text-gray-400">Add documents to the system_metrics collection to see health data here.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Schedule - Empty state as no real data */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Maintenance Schedule
              </CardTitle>
              <CardDescription>Upcoming and completed maintenance tasks</CardDescription>
            </div>
            <Button>
              <Wrench className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Maintenance Tasks</h3>
            <p className="text-gray-500 mb-4">No maintenance tasks found in the database.</p>
            <p className="text-sm text-gray-400">Add documents to the maintenance_tasks collection to see scheduled tasks here.</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Maintenance Actions
          </CardTitle>
          <CardDescription>Common maintenance tasks and system operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleMaintenanceAction('Database Optimization')}
              disabled={actionLoading === 'Database Optimization'}
            >
              {actionLoading === 'Database Optimization' ? (
                <Loader2 className="h-6 w-6 mb-2 animate-spin" />
              ) : (
                <Database className="h-6 w-6 mb-2" />
              )}
              Optimize Database
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleMaintenanceAction('Clear Temporary Files')}
              disabled={actionLoading === 'Clear Temporary Files'}
            >
              {actionLoading === 'Clear Temporary Files' ? (
                <Loader2 className="h-6 w-6 mb-2 animate-spin" />
              ) : (
                <HardDrive className="h-6 w-6 mb-2" />
              )}
              Clear Temporary Files
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleMaintenanceAction('Restart Services')}
              disabled={actionLoading === 'Restart Services'}
            >
              {actionLoading === 'Restart Services' ? (
                <Loader2 className="h-6 w-6 mb-2 animate-spin" />
              ) : (
                <Server className="h-6 w-6 mb-2" />
              )}
              Restart Services
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleMaintenanceAction('Update System')}
              disabled={actionLoading === 'Update System'}
            >
              {actionLoading === 'Update System' ? (
                <Loader2 className="h-6 w-6 mb-2 animate-spin" />
              ) : (
                <Settings className="h-6 w-6 mb-2" />
              )}
              Update System
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleMaintenanceAction('Run Diagnostics')}
              disabled={actionLoading === 'Run Diagnostics'}
            >
              {actionLoading === 'Run Diagnostics' ? (
                <Loader2 className="h-6 w-6 mb-2 animate-spin" />
              ) : (
                <CheckCircle className="h-6 w-6 mb-2" />
              )}
              Run Diagnostics
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleMaintenanceAction('System Cleanup')}
              disabled={actionLoading === 'System Cleanup'}
            >
              {actionLoading === 'System Cleanup' ? (
                <Loader2 className="h-6 w-6 mb-2 animate-spin" />
              ) : (
                <Wrench className="h-6 w-6 mb-2" />
              )}
              System Cleanup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMaintenance;