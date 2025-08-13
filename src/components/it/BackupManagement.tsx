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
import { useBackups } from '@/hooks/useBackups';


const BackupManagement = () => {
  const { stats, percentUsed, jobs, schedules, loading, startFullBackup, startIncremental, restoreData } = useBackups();

  const formatTS = (ts?: any) => {
    try {
      const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
      return d ? d.toLocaleString() : '—';
    } catch {
      return '—';
    }
  };

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
                <p className="text-2xl font-bold">{stats ? `${stats.storage_used_gb?.toFixed?.(1) ?? stats.storage_used_gb} GB` : '—'}</p>
                <Progress value={percentUsed} className="mt-2 h-2" />
                <p className="text-xs text-gray-500 mt-1">{percentUsed}% of {stats?.capacity_gb ?? '—'} GB</p>
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
                <p className="text-2xl font-bold">{stats?.last_backup_status ? stats.last_backup_status[0]?.toUpperCase() + stats.last_backup_status.slice(1) : '—'}</p>
                <p className="text-xs text-gray-500 mt-1">{stats?.last_backup_time?.toDate ? stats.last_backup_time.toDate().toLocaleString() : '—'}</p>
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
                <p className="text-2xl font-bold">Scheduled</p>
                <p className="text-xs text-gray-500 mt-1">{stats?.next_backup_time?.toDate ? stats.next_backup_time.toDate().toLocaleString() : '—'}</p>
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
            <Button className="h-16 flex-col" onClick={startFullBackup} disabled={loading}>
              <Download className="h-6 w-6 mb-2" />
              Start Full Backup
            </Button>
            <Button variant="outline" className="h-16 flex-col" onClick={startIncremental} disabled={loading}>
              <Upload className="h-6 w-6 mb-2" />
              Incremental Backup
            </Button>
            <Button variant="outline" className="h-16 flex-col" disabled>
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
            {schedules.length === 0 && (
              <div className="p-4 border rounded-lg text-sm text-muted-foreground">No schedules defined.</div>
            )}
            {schedules.map((s) => (
              <div key={s.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{s.name}</h4>
                    <p className="text-sm text-gray-500">{s.cron}</p>
                  </div>
                  <Badge className={s.active ? 'bg-green-100 text-green-800' : ''}>{s.active ? 'Active' : 'Paused'}</Badge>
                </div>
              </div>
            ))}
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
            {jobs.length === 0 && (
              <div className="p-4 border rounded-lg text-sm text-muted-foreground">No backup jobs yet.</div>
            )}
            {jobs.map((backup) => (
              <div key={backup.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(backup.status)}
                    <div>
                      <h4 className="font-medium">{backup.type}</h4>
                      <p className="text-sm text-gray-500">{formatTS(backup.date)}</p>
                    </div>
                  </div>
                  {getStatusBadge(backup.status)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Size: </span>
                    <span className="font-medium">{backup.size ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration: </span>
                    <span className="font-medium">{backup.duration ?? '—'}</span>
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