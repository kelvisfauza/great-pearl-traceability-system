import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Monitor
} from 'lucide-react';

const SystemOverview = () => {
  const systemMetrics = [
    { name: 'CPU Usage', value: 45, status: 'normal', icon: Cpu },
    { name: 'Memory Usage', value: 67, status: 'warning', icon: Activity },
    { name: 'Disk Usage', value: 78, status: 'warning', icon: HardDrive },
    { name: 'Network Load', value: 32, status: 'normal', icon: Monitor }
  ];

  const services = [
    { name: 'Database Server', status: 'running', uptime: '15 days', icon: Database },
    { name: 'Web Server', status: 'running', uptime: '15 days', icon: Server },
    { name: 'Email Server', status: 'running', uptime: '12 days', icon: Server },
    { name: 'Backup Service', status: 'maintenance', uptime: '2 hours', icon: Server },
    { name: 'Coffee ERP API', status: 'running', uptime: '15 days', icon: Server },
    { name: 'Firebase Services', status: 'running', uptime: '30 days', icon: Database }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <Badge className="bg-green-100 text-green-800">Running</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'maintenance': return <Badge className="bg-blue-100 text-blue-800">Maintenance</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemMetrics.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <metric.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                {metric.status === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage</span>
                  <span>{metric.value}%</span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Services
          </CardTitle>
          <CardDescription>Current status of all system services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                  <service.icon className="h-4 w-4" />
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-500">Uptime: {service.uptime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(service.status)}
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent System Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: '2 minutes ago', action: 'Backup completed successfully', type: 'success' },
              { time: '15 minutes ago', action: 'User login detected from new device', type: 'warning' },
              { time: '1 hour ago', action: 'Database optimization completed', type: 'info' },
              { time: '3 hours ago', action: 'Security scan completed - no threats found', type: 'success' },
              { time: '6 hours ago', action: 'System maintenance window started', type: 'info' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-2 border-l-2 border-l-blue-500 pl-3">
                <div className="text-sm">
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemOverview;