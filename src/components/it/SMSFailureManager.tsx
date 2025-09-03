import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Phone, Copy, Search } from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    fetchFailures();
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
              <CardTitle>SMS Failure Support</CardTitle>
              <CardDescription>
                Users who couldn't receive their verification codes
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
              {filteredFailures.map((failure) => (
                <Card key={failure.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{failure.user_name || 'Unknown User'}</h3>
                          <Badge variant="outline">
                            {failure.department} {failure.role}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Email: {failure.user_email}</div>
                          <div>Phone: {failure.user_phone}</div>
                          <div>
                            Failed: {format(new Date(failure.created_at), 'MMM d, yyyy HH:mm')}
                          </div>
                          <div>Reason: {failure.failure_reason}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="text-sm font-mono">
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => callUser(failure.user_phone)}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call User
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};