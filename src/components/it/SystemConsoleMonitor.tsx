import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Monitor, 
  AlertTriangle, 
  Info, 
  Bug, 
  Trash2, 
  Download, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useSupabaseConsoleMonitor, ConsoleLog } from '@/hooks/useSupabaseConsoleMonitor';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const SystemConsoleMonitor = () => {
  const { logs, loading, fetchLogs, getLogStats, clearOldLogs } = useSupabaseConsoleMonitor();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    level: 'all',
    department: 'all',
    timeRange: '24',
    search: ''
  });

  const stats = getLogStats();

  useEffect(() => {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - parseInt(filters.timeRange));
    
    fetchLogs(
      filters.level !== 'all' ? filters.level : undefined,
      filters.search || undefined,
      filters.department !== 'all' ? filters.department : undefined,
      startDate.toISOString()
    );
  }, [filters.level, filters.department, filters.timeRange, fetchLogs]);

  const handleRefresh = () => {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - parseInt(filters.timeRange));
    fetchLogs(
      filters.level !== 'all' ? filters.level : undefined,
      filters.search || undefined,
      filters.department !== 'all' ? filters.department : undefined,
      startDate.toISOString()
    );
    toast({
      title: "Logs Refreshed",
      description: "Console logs have been refreshed"
    });
  };

  const handleClearOldLogs = async () => {
    if (confirm('Are you sure you want to clear logs older than 7 days?')) {
      const success = await clearOldLogs(7);
      if (success) {
        toast({
          title: "Logs Cleared",
          description: "Old logs have been removed successfully"
        });
      }
    }
  };

  const handleExportLogs = () => {
    const csv = [
      ['Time', 'Level', 'User', 'Department', 'Message', 'URL'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.level,
        log.user_name || 'Unknown',
        log.user_department || 'Unknown',
        `"${(log.message || '').replace(/"/g, '""').substring(0, 500)}"`,
        log.url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Console logs exported to CSV"
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug': return <Bug className="h-4 w-4 text-purple-500" />;
      default: return <Monitor className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
      error: 'destructive',
      warn: 'secondary',
      info: 'default',
      debug: 'outline',
      log: 'outline'
    };
    return <Badge variant={variants[level] || 'outline'}>{level}</Badge>;
  };

  // Filter logs based on search
  const filteredLogs = logs.filter(log => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      log.message?.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower) ||
      log.user_department?.toLowerCase().includes(searchLower)
    );
  });

  // Get unique departments for filter
  const departments = [...new Set(logs.map(l => l.user_department).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Console Monitor</h2>
          <p className="text-muted-foreground">Real-time console log tracking across all users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearOldLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Old
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.errors}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-500">{stats.warnings}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.info}</p>
                <p className="text-sm text-muted-foreground">Info/Log</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-purple-500">{stats.debug}</p>
                <p className="text-sm text-muted-foreground">Debug</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Error Alert */}
      {stats.errors > 10 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            High error rate detected! {stats.errors} errors in the selected time period. Please investigate immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Log Level</Label>
              <Select value={filters.level} onValueChange={(v) => setFilters({...filters, level: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="warn">Warnings</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="log">Log</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={filters.department} onValueChange={(v) => setFilters({...filters, department: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time Range</Label>
              <Select value={filters.timeRange} onValueChange={(v) => setFilters({...filters, timeRange: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 1 hour</SelectItem>
                  <SelectItem value="6">Last 6 hours</SelectItem>
                  <SelectItem value="24">Last 24 hours</SelectItem>
                  <SelectItem value="72">Last 3 days</SelectItem>
                  <SelectItem value="168">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Console Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>Real-time system-wide console log capture</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No console logs found for the selected filters.</p>
              <p className="text-sm mt-2">Logs are captured automatically from user browsers.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Time</TableHead>
                    <TableHead className="w-[80px]">Level</TableHead>
                    <TableHead className="w-[120px]">User</TableHead>
                    <TableHead className="w-[120px]">Department</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className={log.level === 'error' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getLevelIcon(log.level)}
                          {getLevelBadge(log.level)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_department || 'Unknown'}
                      </TableCell>
                      <TableCell className="max-w-[400px] truncate text-sm font-mono">
                        {log.message?.substring(0, 200)}
                        {(log.message?.length || 0) > 200 && '...'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemConsoleMonitor;
