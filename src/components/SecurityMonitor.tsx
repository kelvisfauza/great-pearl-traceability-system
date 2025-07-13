import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Eye, Clock, Users, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const SecurityMonitor = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use any to bypass TypeScript type checking for the new table
      const { data, error: fetchError } = await (supabase as any)
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        if (fetchError.message.includes('row-level security')) {
          setError('Access denied: Only administrators can view security logs');
        } else {
          setError('Failed to fetch security events');
        }
        console.error('Error fetching security events:', fetchError);
        return;
      }

      setSecurityEvents(data || []);
    } catch (err) {
      console.error('Error in fetchSecurityEvents:', err);
      setError('A system error occurred while fetching security events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('login') || action.includes('created')) return 'default';
    if (action.includes('failed') || action.includes('deleted')) return 'destructive';
    if (action.includes('updated')) return 'secondary';
    return 'outline';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return <Users className="h-4 w-4" />;
    if (action.includes('created')) return <Shield className="h-4 w-4" />;
    if (action.includes('updated')) return <Activity className="h-4 w-4" />;
    if (action.includes('deleted') || action.includes('failed')) return <AlertTriangle className="h-4 w-4" />;
    return <Eye className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSecurityStats = () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events24h = securityEvents.filter(e => new Date(e.created_at) > last24h);
    const events7d = securityEvents.filter(e => new Date(e.created_at) > last7d);
    const failedLogins = securityEvents.filter(e => e.action.includes('failed_login'));
    const adminActions = securityEvents.filter(e => e.action.includes('employee_') && e.action !== 'employee_viewed');

    return {
      total: securityEvents.length,
      last24h: events24h.length,
      last7d: events7d.length,
      failedLogins: failedLogins.length,
      adminActions: adminActions.length
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
          <CardDescription>Loading security events...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading security data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Security Monitor - Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchSecurityEvents} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = getSecurityStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
          <CardDescription>
            Real-time security event monitoring and audit trail
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last 24h</p>
                <p className="text-2xl font-bold">{stats.last24h}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
                <p className="text-2xl font-bold">{stats.last7d}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Logins</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedLogins}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Actions</p>
                <p className="text-2xl font-bold">{stats.adminActions}</p>
              </div>
              <Shield className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="employees">Employee Management</TabsTrigger>
          <TabsTrigger value="failed">Security Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Latest security events across all categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getActionIcon(event.action)}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(event.action)}>
                            {event.action.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-600">{event.table_name}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          User ID: {event.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(event.created_at)}</p>
                      {event.record_id && (
                        <p className="text-xs text-gray-500">
                          Record: {event.record_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {securityEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No security events recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents
                  .filter(e => e.action.includes('login') || e.action.includes('signup') || e.action.includes('logout'))
                  .slice(0, 20)
                  .map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getActionIcon(event.action)}
                        <div>
                          <Badge variant={getActionBadgeVariant(event.action)}>
                            {event.action.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            User ID: {event.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{formatDate(event.created_at)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Management Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents
                  .filter(e => e.action.includes('employee_'))
                  .slice(0, 20)
                  .map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getActionIcon(event.action)}
                        <div>
                          <Badge variant={getActionBadgeVariant(event.action)}>
                            {event.action.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            Record ID: {event.record_id?.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{formatDate(event.created_at)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Security Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents
                  .filter(e => e.action.includes('failed') || e.action.includes('denied'))
                  .slice(0, 20)
                  .map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <div>
                          <Badge variant="destructive">
                            {event.action.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            User ID: {event.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{formatDate(event.created_at)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Security Status: Active</span>
            </div>
            <Button onClick={fetchSecurityEvents} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityMonitor;
