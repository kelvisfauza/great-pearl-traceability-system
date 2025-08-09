import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  Eye, 
  FileText,
  UserCheck,
  Activity,
  Globe
} from 'lucide-react';

const SecurityMonitoring = () => {
  const securityAlerts = [
    {
      id: 1,
      type: 'Failed Login Attempts',
      severity: 'medium',
      count: 5,
      time: '10 minutes ago',
      details: 'Multiple failed login attempts from IP 192.168.1.100'
    },
    {
      id: 2,
      type: 'Firewall Block',
      severity: 'low',
      count: 12,
      time: '1 hour ago',
      details: 'Blocked suspicious traffic from external sources'
    },
    {
      id: 3,
      type: 'Permission Change',
      severity: 'high',
      count: 1,
      time: '2 hours ago',
      details: 'Admin permissions granted to user john.doe@company.com'
    }
  ];

  const securityMetrics = [
    { label: 'Active Sessions', value: '47', trend: 'up' },
    { label: 'Failed Logins Today', value: '23', trend: 'down' },
    { label: 'Security Scans', value: '4', trend: 'stable' },
    { label: 'Firewall Blocks', value: '156', trend: 'up' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {securityMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Alerts
              </CardTitle>
              <CardDescription>Recent security events requiring attention</CardDescription>
            </div>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityAlerts.map((alert) => (
              <div key={alert.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{alert.type}</h4>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">{alert.time}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{alert.details}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Count: {alert.count}</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm">Investigate</Button>
                    <Button variant="ghost" size="sm">Dismiss</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Enabled for 89% of users</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Password Policy</p>
                <p className="text-sm text-gray-500">Strong passwords required</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Enforced</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-gray-500">30 minutes of inactivity</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Firewall Status</p>
                <p className="text-sm text-gray-500">All ports protected</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">SSL Certificate</p>
                <p className="text-sm text-gray-500">Valid until Dec 2024</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Valid</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Backup Encryption</p>
                <p className="text-sm text-gray-500">AES-256 encryption</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Enabled</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityMonitoring;