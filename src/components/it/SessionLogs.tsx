import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin, Monitor, Smartphone, Tablet, Globe, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface SessionLog {
  id: string;
  user_id: string;
  employee_name: string | null;
  employee_email: string | null;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  device_model: string | null;
  latitude: number | null;
  longitude: number | null;
  location_address: string | null;
  login_at: string;
  logout_at: string | null;
  session_duration_minutes: number | null;
  session_date: string | null;
}

const DeviceIcon = ({ type }: { type?: string | null }) => {
  if (type === 'Mobile') return <Smartphone className="h-3.5 w-3.5" />;
  if (type === 'Tablet') return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
};

const formatDuration = (mins: number | null) => {
  if (!mins) return '-';
  if (mins < 1) return '<1m';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
};

const SessionLogs = () => {
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [q, setQ] = useState('');

  const fetchLogs = async (date: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_session_logs')
        .select('*')
        .eq('session_date', date)
        .order('login_at', { ascending: false });

      if (!error && data) {
        setLogs(data as SessionLog[]);
      }
    } catch (err) {
      console.error('Error fetching session logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [selectedDate]);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    if (!qq) return logs;
    return logs.filter(l =>
      (l.employee_name || '').toLowerCase().includes(qq) ||
      (l.employee_email || '').toLowerCase().includes(qq) ||
      (l.location_address || '').toLowerCase().includes(qq) ||
      (l.device_model || '').toLowerCase().includes(qq) ||
      (l.ip_address || '').toLowerCase().includes(qq) ||
      (l.browser || '').toLowerCase().includes(qq)
    );
  }, [logs, q]);

  const stats = useMemo(() => {
    const uniqueUsers = new Set(logs.map(l => l.user_id)).size;
    const totalDuration = logs.reduce((sum, l) => sum + (l.session_duration_minutes || 0), 0);
    const activeSessions = logs.filter(l => !l.logout_at).length;
    return { uniqueUsers, totalSessions: logs.length, totalDuration, activeSessions };
  }, [logs]);

  const goDay = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const exportCSV = () => {
    const headers = ['Date', 'Name', 'Email', 'Login Time', 'Logout Time', 'Duration', 'Device', 'Browser', 'OS', 'IP', 'Location', 'Latitude', 'Longitude'];
    const rows = filtered.map(l => [
      l.session_date || '',
      l.employee_name || '',
      l.employee_email || '',
      l.login_at ? format(new Date(l.login_at), 'HH:mm:ss') : '',
      l.logout_at ? format(new Date(l.logout_at), 'HH:mm:ss') : 'Active',
      formatDuration(l.session_duration_minutes),
      l.device_model || '',
      l.browser || '',
      l.os || '',
      l.ip_address || '',
      l.location_address || '',
      l.latitude?.toString() || '',
      l.longitude?.toString() || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-logs-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Session Logs
        </CardTitle>
        <CardDescription>
          Daily session history with location, device, and duration tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date navigation + stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto h-8"
            />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(1)}
              disabled={selectedDate >= format(new Date(), 'yyyy-MM-dd')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{stats.uniqueUsers} users</Badge>
            <Badge variant="secondary">{stats.totalSessions} sessions</Badge>
            {stats.activeSessions > 0 && (
              <Badge className="bg-green-100 text-green-800">{stats.activeSessions} active now</Badge>
            )}
            <Badge variant="outline">{formatDuration(stats.totalDuration)} total</Badge>
          </div>
          <Button variant="outline" size="sm" className="ml-auto h-8" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>

        <Input placeholder="Search by name, email, location, device, IP..." value={q} onChange={(e) => setQ(e.target.value)} />

        {loading && <div className="text-sm text-muted-foreground">Loading logs...</div>}
        {!loading && filtered.length === 0 && <div className="text-sm text-muted-foreground">No session logs for this date.</div>}

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {!loading && filtered.map((log) => (
            <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{log.employee_name || 'Unknown'}</p>
                  <span className="text-xs text-muted-foreground">{log.employee_email}</span>
                </div>

                {/* Time info */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.login_at), 'HH:mm:ss')}
                    {' → '}
                    {log.logout_at ? format(new Date(log.logout_at), 'HH:mm:ss') : (
                      <Badge className="bg-green-100 text-green-800 text-[10px] px-1 py-0">Active</Badge>
                    )}
                  </span>
                  {log.session_duration_minutes && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {formatDuration(log.session_duration_minutes)}
                    </Badge>
                  )}
                </div>

                {/* Location */}
                {log.location_address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-red-500 flex-shrink-0" />
                    <span className="truncate">{log.location_address}</span>
                    {log.latitude && log.longitude && (
                      <span className="text-[10px] text-muted-foreground/60">
                        ({log.latitude.toFixed(4)}, {log.longitude.toFixed(4)})
                      </span>
                    )}
                  </p>
                )}

                {/* Device info */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {log.device_model && log.device_model !== 'Unknown Device' && (
                    <span className="flex items-center gap-1 font-medium text-foreground/70">
                      <DeviceIcon type={log.device_type} />
                      {log.device_model}
                    </span>
                  )}
                  {log.browser && (
                    <span>{log.browser} • {log.os}</span>
                  )}
                  {log.ip_address && log.ip_address !== 'unknown' && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {log.ip_address}
                    </span>
                  )}
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] shrink-0">
                <DeviceIcon type={log.device_type} />
                <span className="ml-1">{log.device_type || 'Unknown'}</span>
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionLogs;
