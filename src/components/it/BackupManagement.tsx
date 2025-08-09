import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  HardDrive, 
  Download, 
  Upload, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Shield
} from 'lucide-react';

const BackupManagement = () => {
  const backupHistory = [
    {
      id: 1,
      date: '2024-01-08 02:00',
      type: 'Full Backup',
      size: '2.4 GB',
      status: 'completed',
      duration: '23 minutes'
    },
    {
      id: 2,
      date: '2024-01-07 02:00',
      type: 'Incremental',
      size: '145 MB',
      status: 'completed',
      duration: '3 minutes'
    },
    {
      id: 3,
      date: '2024-01-06 02:00',
      type: 'Incremental',
      size: '89 MB',
      status: 'completed',
      duration: '2 minutes'
    },
    {
      id: 4,
      date: '2024-01-05 02:00',
      type: 'Incremental',
      size: '203 MB',
      status: 'failed',
      duration: '1 minute'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">24.7 GB</p>
                <Progress value={65} className="mt-2 h-2" />
                <p className="text-xs text-gray-500 mt-1">65% of 38 GB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Last Backup</p>
                <p className="text-2xl font-bold">Success</p>
                <p className="text-xs text-gray-500 mt-1">Jan 8, 2:00 AM</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Next Backup</p>
                <p className="text-2xl font-bold">Tonight</p>
                <p className="text-xs text-gray-500 mt-1">Jan 9, 2:00 AM</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup Controls
          </CardTitle>
          <CardDescription>Manage backup operations and schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-16 flex-col">
              <Download className="h-6 w-6 mb-2" />
              Start Full Backup
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Upload className="h-6 w-6 mb-2" />
              Incremental Backup
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Shield className="h-6 w-6 mb-2" />
              Restore Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Backup Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Full System Backup</h4>
                  <p className="text-sm text-gray-500">Every Sunday at 2:00 AM</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Incremental Backup</h4>
                  <p className="text-sm text-gray-500">Daily at 2:00 AM (except Sunday)</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Database Backup</h4>
                  <p className="text-sm text-gray-500">Every 6 hours</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Recent Backups
          </CardTitle>
          <CardDescription>History of backup operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backupHistory.map((backup) => (
              <div key={backup.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(backup.status)}
                    <div>
                      <h4 className="font-medium">{backup.type}</h4>
                      <p className="text-sm text-gray-500">{backup.date}</p>
                    </div>
                  </div>
                  {getStatusBadge(backup.status)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Size: </span>
                    <span className="font-medium">{backup.size}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration: </span>
                    <span className="font-medium">{backup.duration}</span>
                  </div>
                </div>
                {backup.status === 'completed' && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Shield className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;