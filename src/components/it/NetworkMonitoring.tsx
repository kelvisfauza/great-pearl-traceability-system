import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  Router, 
  Globe, 
  Activity,
  TrendingUp,
  TrendingDown,
  Monitor,
  Server
} from 'lucide-react';

const NetworkMonitoring = () => {
  const networkDevices = [
    {
      id: 1,
      name: 'Main Router',
      type: 'Router',
      ip: '192.168.1.1',
      status: 'online',
      uptime: '45 days',
      traffic: '85%'
    },
    {
      id: 2,
      name: 'Core Switch',
      type: 'Switch',
      ip: '192.168.1.2',
      status: 'online',
      uptime: '45 days',
      traffic: '67%'
    },
    {
      id: 3,
      name: 'WiFi Access Point 1',
      type: 'Access Point',
      ip: '192.168.1.10',
      status: 'online',
      uptime: '30 days',
      traffic: '45%'
    },
    {
      id: 4,
      name: 'WiFi Access Point 2',
      type: 'Access Point',
      ip: '192.168.1.11',
      status: 'offline',
      uptime: '0 minutes',
      traffic: '0%'
    }
  ];

  const trafficData = [
    { time: '00:00', inbound: 45, outbound: 32 },
    { time: '04:00', inbound: 23, outbound: 18 },
    { time: '08:00', inbound: 78, outbound: 65 },
    { time: '12:00', inbound: 92, outbound: 87 },
    { time: '16:00', inbound: 85, outbound: 76 },
    { time: '20:00', inbound: 67, outbound: 54 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case 'offline': return <Badge className="bg-red-100 text-red-800">Offline</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Router': return <Router className="h-4 w-4" />;
      case 'Switch': return <Server className="h-4 w-4" />;
      case 'Access Point': return <Wifi className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Internet Status</p>
                <p className="text-2xl font-bold text-green-600">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Download Speed</p>
                <p className="text-2xl font-bold">89 Mbps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Upload Speed</p>
                <p className="text-2xl font-bold">67 Mbps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Latency</p>
                <p className="text-2xl font-bold">12ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5" />
            Network Devices
          </CardTitle>
          <CardDescription>Status of all network infrastructure devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {networkDevices.map((device) => (
              <div key={device.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`} />
                    {getDeviceIcon(device.type)}
                    <div>
                      <h4 className="font-medium">{device.name}</h4>
                      <p className="text-sm text-gray-500">{device.ip}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(device.status)}
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Device Type</p>
                    <p className="text-sm text-gray-600">{device.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Uptime</p>
                    <p className="text-sm text-gray-600">{device.uptime}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Traffic Load</p>
                    <div className="mt-1">
                      <Progress value={parseInt(device.traffic)} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">{device.traffic}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Traffic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Network Traffic (24 Hours)
          </CardTitle>
          <CardDescription>Real-time network traffic monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trafficData.map((data, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{data.time}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">↓ {data.inbound} Mbps</span>
                    <span className="text-blue-600">↑ {data.outbound} Mbps</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Inbound</p>
                    <Progress value={data.inbound} className="h-2" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Outbound</p>
                    <Progress value={data.outbound} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Network Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2">Firewall Status</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Protection Level: High</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2">Intrusion Detection</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">No threats detected</span>
                <Badge className="bg-green-100 text-green-800">Secure</Badge>
              </div>
            </div>
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2">VPN Connections</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">3 active connections</span>
                <Badge className="bg-blue-100 text-blue-800">Active</Badge>
              </div>
            </div>
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2">Bandwidth Usage</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">67% of available</span>
                <Badge className="bg-yellow-100 text-yellow-800">Monitor</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkMonitoring;