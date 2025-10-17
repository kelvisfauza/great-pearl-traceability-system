import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const PasswordResetSMS = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    phone?: string;
    temp_password?: string;
    sms_sent?: boolean;
    sms_error?: string;
  } | null>(null);

  const handleSendReset = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('📤 Sending password reset SMS for:', email);
      
      const { data, error } = await supabase.functions.invoke('send-password-reset-sms', {
        body: { email }
      });

      if (error) {
        console.error('❌ Error:', error);
        toast.error('Failed to send password reset');
        setResult({
          success: false,
          message: error.message || 'Failed to send password reset SMS'
        });
        return;
      }

      console.log('✅ Response:', data);
      
      if (data.success) {
        if (data.sms_sent) {
          toast.success('Password reset SMS sent successfully');
        } else {
          toast.error('Password reset but SMS failed - show password to employee');
        }
        setResult(data);
      } else {
        toast.error(data.error || 'Failed to send password reset');
        setResult({
          success: false,
          message: data.error || 'Unknown error occurred'
        });
      }
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      toast.error('An unexpected error occurred');
      setResult({
        success: false,
        message: err.message || 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Send Password Reset via SMS
        </CardTitle>
        <CardDescription>
          Send a temporary password to employee via SMS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Employee Email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="employee@greatpearlcoffee.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button
          onClick={handleSendReset}
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending SMS...
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4 mr-2" />
              Send Password Reset SMS
            </>
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? (result.sms_sent ? "default" : "destructive") : "destructive"}>
            {result.success ? (
              result.sms_sent ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium">{result.message}</p>
                {result.success && result.phone && (
                  <div className="text-sm space-y-2">
                    <p>📱 Phone: {result.phone}</p>
                    
                    {!result.sms_sent && result.sms_error && (
                      <div className="bg-destructive/10 p-2 rounded border border-destructive/20">
                        <p className="text-destructive font-semibold">⚠️ SMS Failed to Send</p>
                        <p className="text-xs text-muted-foreground">Error: {result.sms_error}</p>
                      </div>
                    )}
                    
                    {result.temp_password && (
                      <div className={`p-3 rounded border-2 ${result.sms_sent ? 'bg-muted border-primary' : 'bg-destructive/5 border-destructive'}`}>
                        <p className="font-semibold mb-1">
                          {result.sms_sent ? '✅ Temporary Password (Sent via SMS):' : '⚠️ Temporary Password (GIVE TO EMPLOYEE):'}
                        </p>
                        <p className="text-2xl font-mono font-bold text-primary">
                          {result.temp_password}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-muted-foreground">
                      {result.sms_sent 
                        ? 'The employee will receive: "Your temporary password is: [password]. Please delete this message for security. - Great Pearl Coffee IT Department"'
                        : '🚨 You MUST provide this password to the employee manually since SMS failed to send!'}
                    </p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>How it works:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>System generates a temporary password</li>
              <li>Password is sent via SMS to employee's phone</li>
              <li>Employee can log in with the temporary password</li>
              <li>They'll be prompted to change it on first login</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};