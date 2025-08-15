import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Monitor, 
  AlertTriangle, 
  Info, 
  Bug, 
  Trash2, 
  Filter, 
  Download, 
  RefreshCw,
  Users,
  Building,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useSystemConsoleMonitor } from '@/hooks/useSystemConsoleMonitor';
import { formatDistanceToNow } from 'date-fns';

const SystemConsoleMonitor = () => {
  const { logs, loading, fetchLogs, getLogStats, clearOldLogs } = useSystemConsoleMonitor();
  const [filters, setFilters] = useState({
    level: 'all',
    department: 'all',
    timeRange: '24', // hours
    search: ''
  });

  const stats = getLogStats();

  useEffect(() => {
    fetchLogs({
      level: filters.level !== 'all' ? filters.level : undefined,
      department: filters.department !== 'all' ? filters.department : undefined,
      timeRange: parseInt(filters.timeRange),
      limit: 500
    });
  }, [filters, fetchLogs]);

  const handleRefresh = () => {
    fetchLogs({
      level: filters.level !== 'all' ? filters.level : undefined,
      department: filters.department !== 'all' ? filters.department : undefined,
      timeRange: parseInt(filters.timeRange),
      limit: 500
    });
  };

  const handleClearOldLogs = async () => {
    if (confirm('Are you sure you want to clear logs older than 7 days?')) {
      await clearOldLogs(7);
      handleRefresh();
    }
  };

  const handleExportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'User', 'Department', 'Message', 'URL'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.level,
        log.userName || 'Unknown',
        log.userDepartment || 'Unknown',
        `"${log.message.replace(/"/g, '""')}"`,
        log.url
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.message.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower) ||
        log.userDepartment?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug':
        return <Bug className="h-4 w-4 text-gray-500" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      error: 'destructive',
      warn: 'secondary',
      info: 'default',
      debug: 'outline',
      log: 'outline'
    };
    return <Badge variant={variants[level] as any}>{level.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Console Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of all user console logs across the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleClearOldLogs} variant="outline">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Old
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-xl font-bold text-red-600">{stats.errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-xl font-bold text-yellow-600">{stats.warnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Info</p>
                <p className="text-xl font-bold">{stats.info}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Debug</p>
                <p className="text-xl font-bold">{stats.debug}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Recent Errors</p>
                <p className="text-xl font-bold text-orange-600">{stats.recentErrors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="level">Log Level</Label>
              <Select value={filters.level} onValueChange={(value) => setFilters({...filters, level: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="log">Log</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {Object.keys(stats.byDepartment).map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept} ({stats.byDepartment[dept]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeRange">Time Range</Label>
              <Select value={filters.timeRange} onValueChange={(value) => setFilters({...filters, timeRange: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 1 hour</SelectItem>
                  <SelectItem value="6">Last 6 hours</SelectItem>
                  <SelectItem value="24">Last 24 hours</SelectItem>
                  <SelectItem value="168">Last 7 days</SelectItem>
                  <SelectItem value="720">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search messages, users, or departments..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Console Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Console Logs ({filteredLogs.length})
          </CardTitle>
          <CardDescription>
            Real-time console output from all users across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Page</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        {getLevelBadge(log.level)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {log.userName || 'Anonymous'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {log.userDepartment || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm font-mono truncate" title={log.message}>
                        {log.message}
                      </div>
                      {log.stackTrace && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Stack trace
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {log.stackTrace}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new URL(log.url).pathname}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No console logs found matching the current filters.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alert for high error rates */}
      {stats.recentErrors > 10 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            High error rate detected: {stats.recentErrors} errors in the last 24 hours. 
            Consider investigating system stability.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SystemConsoleMonitor;