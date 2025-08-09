import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Cpu
} from 'lucide-react';

const SystemMaintenance = () => {
  const maintenanceTasks = [
    {
      id: 1,
      title: 'Database Optimization',
      description: 'Optimize database queries and rebuild indexes',
      type: 'Database',
      schedule: '2024-01-15 02:00',
      duration: '2 hours',
      status: 'scheduled',
      impact: 'medium'
    },
    {
      id: 2,
      title: 'Security Updates',
      description: 'Install latest security patches for all systems',
      type: 'Security',
      schedule: '2024-01-12 01:00',
      duration: '1 hour',
      status: 'scheduled',
      impact: 'low'
    },
    {
      id: 3,
      title: 'Server Hardware Check',
      description: 'Physical inspection and testing of server hardware',
      type: 'Hardware',
      schedule: '2024-01-20 03:00',
      duration: '4 hours',
      status: 'scheduled',
      impact: 'high'
    },
    {
      id: 4,
      title: 'Backup System Test',
      description: 'Test backup and recovery procedures',
      type: 'Backup',
      schedule: '2024-01-08 02:00',
      duration: '3 hours',
      status: 'completed',
      impact: 'medium'
    }
  ];

  const systemHealth = [
    { component: 'CPU Usage', status: 'healthy', value: 45, threshold: 80 },
    { component: 'Memory Usage', status: 'warning', value: 75, threshold: 80 },
    { component: 'Disk Space', status: 'healthy', value: 60, threshold: 85 },
    { component: 'Network Load', status: 'healthy', value: 35, threshold: 70 }
  ];

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
      case 'healthy':
        return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, color: 'text-green-600' };
      case 'warning':
        return { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, color: 'text-yellow-600' };
      case 'critical':
        return { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, color: 'text-red-600' };
      default:
        return { icon: <CheckCircle className="h-4 w-4 text-gray-500" />, color: 'text-gray-600' };
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
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
            {systemHealth.map((item) => {
              const healthStatus = getHealthStatus(item.status);
              return (
                <div key={item.component} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {healthStatus.icon}
                      <h4 className="font-medium">{item.component}</h4>
                    </div>
                    <span className={`text-sm font-medium ${healthStatus.color}`}>
                      {item.value}%
                    </span>
                  </div>
                  <Progress value={item.value} className="mb-2" />
                  <p className="text-xs text-gray-500">
                    Threshold: {item.threshold}% | Status: {item.status}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Schedule */}
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
          <div className="space-y-4">
            {maintenanceTasks.map((task) => (
              <div key={task.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(task.type)}
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(task.status)}
                    {getImpactBadge(task.impact)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Scheduled Time</p>
                    <p className="text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.schedule}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Duration</p>
                    <p className="text-gray-600">{task.duration}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Type</p>
                    <p className="text-gray-600">{task.type}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  {task.status === 'scheduled' && (
                    <>
                      <Button variant="outline" size="sm">
                        Reschedule
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
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
            <Button variant="outline" className="h-20 flex-col">
              <Database className="h-6 w-6 mb-2" />
              Optimize Database
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <HardDrive className="h-6 w-6 mb-2" />
              Clear Temporary Files
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Server className="h-6 w-6 mb-2" />
              Restart Services
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Settings className="h-6 w-6 mb-2" />
              Update System
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <CheckCircle className="h-6 w-6 mb-2" />
              Run Diagnostics
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Wrench className="h-6 w-6 mb-2" />
              System Cleanup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMaintenance;