import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Eye, Lock, Activity, UserX, Database, RefreshCw } from 'lucide-react';
import { useSecurityAlerts } from '@/hooks/useSecurityAlerts';
import { useRealTimeSecurityData } from '@/hooks/useRealTimeSecurityData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (ts?: any) => {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    return d ? d.toLocaleString() : '-';
  } catch {
    return '-';
  }
};

const SecurityMonitoring = () => {
  const { dismiss, investigate } = useSecurityAlerts();
  const { metrics, allSecurityEvents, loading } = useRealTimeSecurityData();

  const securityMetrics = [
    { 
      label: 'Total Alerts', 
      value: String(metrics.totalAlerts),
      icon: AlertTriangle,
      color: 'text-orange-500'
    },
    { 
      label: 'High Severity', 
      value: String(metrics.highSeverityAlerts),
      icon: Shield,
      color: 'text-red-500'
    },
    { 
      label: 'Failed Logins', 
      value: String(metrics.failedLoginAttempts),
      icon: UserX,
      color: 'text-yellow-500'
    },
    { 
      label: 'Audit Events', 
      value: String(metrics.recentAuditEvents),
      icon: Database,
      color: 'text-blue-500'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {securityMetrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                  <IconComponent className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Real-Time Security Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-Time Security Events
              </CardTitle>
              <CardDescription>
                Live security monitoring from Firebase and Supabase
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="high">High Priority</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="failed-logins">Failed Logins</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {loading && (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading security events...</p>
                </div>
              )}
              {!loading && allSecurityEvents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No security events detected</p>
                  <p className="text-xs mt-1">System is secure</p>
                </div>
              )}
              {!loading && allSecurityEvents.slice(0, 20).map((event) => (
                <div key={event.id} className="p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{event.type}</h4>
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.source}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{event.details}</p>
                  {event.source === 'firebase' && event.status && (
                    <div className="flex justify-between items-center mt-3">
                      <Badge variant="secondary">{event.status}</Badge>
                      {(event.status === 'open' || event.status === 'investigating') && (
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => investigate(event.id)}
                          >
                            Investigate
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => dismiss(event.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="high" className="space-y-4 mt-4">
              {allSecurityEvents
                .filter(e => e.severity === 'high')
                .slice(0, 10)
                .map((event) => (
                  <div key={event.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <h4 className="font-medium text-red-900">{event.type}</h4>
                        <Badge className="bg-red-100 text-red-800">CRITICAL</Badge>
                      </div>
                      <span className="text-sm text-red-700">{formatDate(event.timestamp)}</span>
                    </div>
                    <p className="text-sm text-red-800">{event.details}</p>
                  </div>
                ))}
              {allSecurityEvents.filter(e => e.severity === 'high').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No high priority alerts
                </div>
              )}
            </TabsContent>

            <TabsContent value="medium" className="space-y-4 mt-4">
              {allSecurityEvents
                .filter(e => e.severity === 'medium')
                .slice(0, 10)
                .map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{event.type}</h4>
                        <Badge className="bg-yellow-100 text-yellow-800">MEDIUM</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(event.timestamp)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.details}</p>
                  </div>
                ))}
              {allSecurityEvents.filter(e => e.severity === 'medium').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No medium priority alerts
                </div>
              )}
            </TabsContent>

            <TabsContent value="failed-logins" className="space-y-4 mt-4">
              {allSecurityEvents
                .filter(e => e.type.toLowerCase().includes('login'))
                .slice(0, 10)
                .map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium">{event.type}</h4>
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(event.timestamp)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.details}</p>
                  </div>
                ))}
              {allSecurityEvents.filter(e => e.type.toLowerCase().includes('login')).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No failed login attempts
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Security Tools (static placeholders, optional to wire later) */}
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
                <p className="text-sm text-muted-foreground">Configure in Auth settings</p>
              </div>
              <Badge variant="secondary">Info</Badge>
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
                <p className="text-sm text-muted-foreground">Track via security_alerts</p>
              </div>
              <Badge variant="secondary">Info</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityMonitoring;