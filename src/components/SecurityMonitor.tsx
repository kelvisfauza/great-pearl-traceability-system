
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Shield, User, Database } from "lucide-react";

interface SecurityEvent {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  created_at: string;
}

const SecurityMonitor = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin()) return;

    const fetchSecurityEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('security_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching security events:', error);
        } else {
          setEvents(data || []);
        }
      } catch (error) {
        console.error('Error in fetchSecurityEvents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityEvents();

    // Set up real-time subscription for new security events
    const channel = supabase
      .channel('security-events')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'security_audit_log' 
        }, 
        (payload) => {
          setEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('logout')) return <User className="h-4 w-4" />;
    if (action.includes('employee') || action.includes('role')) return <Shield className="h-4 w-4" />;
    return <Database className="h-4 w-4" />;
  };

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('failed') || action.includes('delete')) return 'destructive';
    if (action.includes('login') || action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    return 'outline';
  };

  if (!isAdmin()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            Security monitoring is only available to administrators.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Security Monitor
        </CardTitle>
        <CardDescription>
          Real-time security events and audit log
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6">Loading security events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No security events recorded yet
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-1">
                    {getActionIcon(event.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getActionVariant(event.action)}>
                        {event.action.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Action on <span className="font-medium">{event.table_name}</span>
                      {event.record_id && (
                        <span className="text-gray-500"> (ID: {event.record_id.slice(0, 8)}...)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      User: {event.user_id ? event.user_id.slice(0, 8) + '...' : 'System'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityMonitor;
