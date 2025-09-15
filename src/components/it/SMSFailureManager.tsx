import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Phone, Copy, Search, Clock, AlertTriangle, CheckCircle, MessageCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

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

export const SMSFailureManager = () => {
  const [failures, setFailures] = useState<SMSFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const { toast } = useToast();

  const fetchFailures = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setFailures(data || []);
    } catch (error) {
      console.error('Error fetching SMS failures:', error);
      toast({
        title: "Error",
        description: "Failed to fetch SMS failures",
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
    if (phone.startsWith('+')) {
      window.open(`tel:${phone}`);
    } else {
      window.open(`tel:+256${phone.substring(1)}`);
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
      // Call the SMS edge function directly to resend
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: phone.replace('+256', '0').replace('+', ''),
          message: `${userName} - Pearl Coffee\nCode: ${code}\n(Manual delivery by IT Support)\n(5min only)`,
          userName: userName
        }
      });

      if (error) throw error;

      toast({
        title: "Code Sent",
        description: `Verification code manually sent to ${userName}`,
      });
    } catch (error) {
      console.error('Error sending SMS manually:', error);
      toast({
        title: "Send Failed",
        description: "Could not send SMS manually. Try calling the user instead.",
        variant: "destructive",
      });
    }
  };

  const setupRealTimeSubscription = () => {
    if (realtimeEnabled) return;

    const channel = supabase
      .channel('sms-failures')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_failures'
        },
        (payload) => {
          const newFailure = payload.new as SMSFailure;
          setFailures(prev => [newFailure, ...prev]);
          
          // Show immediate notification for new SMS failure
          toast({
            title: "🚨 SMS Failed to Send",
            description: `${newFailure.user_name} needs manual code delivery: ${newFailure.verification_code}`,
            duration: 10000,
          });
        }
      )
      .subscribe();

    setRealtimeEnabled(true);
    return () => supabase.removeChannel(channel);
  };

  useEffect(() => {
    fetchFailures();
    const cleanup = setupRealTimeSubscription();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const filteredFailures = failures.filter(failure => 
    failure.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    failure.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    failure.user_phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SMS Failure Support</CardTitle>
          <CardDescription>Loading SMS delivery failures...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  SMS Failure Support
                  {realtimeEnabled && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                      Live Monitoring
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Users who couldn't receive their verification codes - IT Support can provide codes manually
                </CardDescription>
              </div>
              <Button onClick={fetchFailures} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredFailures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No SMS failures match your search' : 'No recent SMS failures'}
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
        </CardContent>
      </Card>
    </div>
  );
};