import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Phone, 
  Copy, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MessageCircle,
  Send,
  XCircle,
  TrendingUp,
  Filter,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import { format, differenceInMinutes, subDays } from 'date-fns';

interface SMSLog {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  recipient_email: string | null;
  message_content: string;
  message_type: string;
  status: string;
  provider: string | null;
  provider_response: any;
  credits_used: number | null;
  failure_reason: string | null;
  department: string | null;
  triggered_by: string | null;
  request_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SMSFailure {
  id: string;
  user_email: string;
  user_name: string;
  user_phone: string;
  verification_code: string;
  failure_reason: string;
  department: string;
  role: string;
  created_at: string;
}

export const ComprehensiveSMSManager = () => {
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [smsFailures, setSmsFailures] = useState<SMSFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all');
  const [filterDays, setFilterDays] = useState(7);
  const { toast } = useToast();

  const fetchSMSData = async () => {
    setLoading(true);
    try {
      const cutoffDate = subDays(new Date(), filterDays).toISOString();

      // Fetch SMS logs
      const { data: logsData, error: logsError } = await supabase
        .from('sms_logs')
        .select('*')
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Fetch SMS failures
      const { data: failuresData, error: failuresError } = await supabase
        .from('sms_failures')
        .select('*')
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(50);

      if (failuresError) throw failuresError;

      setSmsLogs(logsData || []);
      setSmsFailures(failuresData || []);
    } catch (error) {
      console.error('Error fetching SMS data:', error);
      console.log('Detailed error:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to fetch SMS data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string, userName: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied",
      description: `Verification code for ${userName} copied to clipboard`,
    });
  };

  const callUser = (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+256${phone.substring(1)}`;
    window.open(`tel:${formattedPhone}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMessageTypeBadge = (type: string) => {
    switch (type) {
      case 'verification':
        return <Badge variant="secondary">Verification</Badge>;
      case 'approval':
        return <Badge className="bg-blue-100 text-blue-800">Approval</Badge>;
      case 'notification':
        return <Badge className="bg-purple-100 text-purple-800">Notification</Badge>;
      case 'general':
        return <Badge variant="outline">General</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getCodeExpiryStatus = (createdAt: string) => {
    const created = new Date(createdAt);
    const minutesElapsed = differenceInMinutes(new Date(), created);
    const isExpired = minutesElapsed > 5; // Codes expire after 5 minutes
    const isExpiringSoon = minutesElapsed > 3 && !isExpired;
    
    return { isExpired, isExpiringSoon, minutesElapsed };
  };

  const sendCodeManually = async (phone: string, code: string, userName: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: phone.replace('+256', '0').replace('+', ''),
          message: `${userName} - Pearl Coffee\nCode: ${code}\n(Manual delivery by IT Support)\n(5min only)`,
          userName: userName,
          messageType: 'verification',
          triggeredBy: 'IT Support Manual Delivery',
          department: 'IT'
        }
      });

      if (error) throw error;

      toast({
        title: "Code Sent",
        description: `Verification code manually sent to ${userName}`,
      });

      // Refresh data to show the new sent message
      fetchSMSData();
    } catch (error) {
      console.error('Error sending SMS manually:', error);
      toast({
        title: "Send Failed",
        description: "Could not send SMS manually. Try calling the user instead.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSMSData();
  }, [filterDays]);

  const filteredLogs = smsLogs.filter(log => {
    const matchesSearch = log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.recipient_phone?.includes(searchTerm) ||
                         log.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.message_content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredFailures = smsFailures.filter(failure => 
    failure.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    failure.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    failure.user_phone?.includes(searchTerm)
  );

  const stats = {
    totalSent: smsLogs.filter(log => log.status === 'sent').length,
    totalFailed: smsLogs.filter(log => log.status === 'failed').length + smsFailures.length,
    totalCredits: smsLogs.reduce((sum, log) => sum + (log.credits_used || 0), 0),
    uniqueRecipients: new Set(smsLogs.map(log => log.recipient_phone)).size
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SMS Management & Support</CardTitle>
          <CardDescription>Loading SMS data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Messages Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalFailed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Credits Used</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Recipients</p>
                <p className="text-2xl font-bold text-purple-600">{stats.uniqueRecipients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                SMS Management & Support
              </CardTitle>
              <CardDescription>
                Monitor all SMS messages sent by the system and provide support for failed deliveries
              </CardDescription>
            </div>
            <Button onClick={fetchSMSData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent Only</option>
              <option value="failed">Failed Only</option>
            </select>
            <select
              value={filterDays}
              onChange={(e) => setFilterDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="logs">All SMS Messages ({filteredLogs.length})</TabsTrigger>
              <TabsTrigger value="failures">Failed Verifications ({filteredFailures.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No SMS messages found matching your filters
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <Card key={log.id} className="border-l-4 border-l-blue-400">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{log.recipient_name || 'Unknown User'}</h3>
                              {getStatusBadge(log.status)}
                              {getMessageTypeBadge(log.message_type)}
                              {log.department && (
                                <Badge variant="outline" className="text-xs">{log.department}</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>Phone: {log.recipient_phone}</div>
                              {log.recipient_email && <div>Email: {log.recipient_email}</div>}
                              <div className="bg-muted p-2 rounded text-xs font-mono max-w-lg">
                                {log.message_content.length > 100 
                                  ? `${log.message_content.substring(0, 100)}...` 
                                  : log.message_content}
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span>Sent: {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</span>
                                {log.triggered_by && <span>Triggered by: {log.triggered_by}</span>}
                                {log.credits_used && <span>Credits: {log.credits_used}</span>}
                              </div>
                              {log.failure_reason && (
                                <div className="text-red-600 text-xs">Error: {log.failure_reason}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-1 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigator.clipboard.writeText(log.message_content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => callUser(log.recipient_phone)}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="failures" className="space-y-4">
              {filteredFailures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No SMS verification failures found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFailures.map((failure) => {
                    const expiryStatus = getCodeExpiryStatus(failure.created_at);
                    const borderColor = expiryStatus.isExpired ? 'border-l-red-500' : 
                                       expiryStatus.isExpiringSoon ? 'border-l-yellow-500' : 'border-l-orange-500';
                    
                    return (
                      <Card key={failure.id} className={`border-l-4 ${borderColor}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{failure.user_name || 'Unknown User'}</h3>
                                <Badge variant="outline">
                                  {failure.department} {failure.role}
                                </Badge>
                                {expiryStatus.isExpired && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Expired
                                  </Badge>
                                )}
                                {expiryStatus.isExpiringSoon && (
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Expiring Soon
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>Email: {failure.user_email}</div>
                                <div>Phone: {failure.user_phone}</div>
                                <div className="flex items-center gap-2">
                                  Failed: {format(new Date(failure.created_at), 'MMM d, yyyy HH:mm')}
                                  <Badge variant="outline" className="text-xs">
                                    {expiryStatus.minutesElapsed}m ago
                                  </Badge>
                                </div>
                                <div className="text-xs">Reason: {failure.failure_reason}</div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <div className={`flex items-center gap-2 p-2 rounded ${
                                expiryStatus.isExpired ? 'bg-red-50 border border-red-200' : 'bg-muted'
                              }`}>
                                <span className="text-sm font-mono font-bold">
                                  Code: {failure.verification_code}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyCode(failure.verification_code, failure.user_name || 'User')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => callUser(failure.user_phone)}
                                  className="flex-1"
                                >
                                  <Phone className="h-3 w-3 mr-1" />
                                  Call
                                </Button>
                                <Button
                                  size="sm"
                                  variant={expiryStatus.isExpired ? "default" : "secondary"}
                                  onClick={() => sendCodeManually(failure.user_phone, failure.verification_code, failure.user_name || 'User')}
                                  className="flex-1"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  {expiryStatus.isExpired ? 'Resend' : 'Retry SMS'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};