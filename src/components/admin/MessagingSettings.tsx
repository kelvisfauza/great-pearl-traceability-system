import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Phone, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ProviderStatus {
  sendgrid: boolean;
  twilio: boolean;
  yoola: boolean;
}

const MessagingSettings = () => {
  const [smsProvider, setSmsProvider] = useState('yoola');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    sendgrid: false,
    twilio: false,
    yoola: true
  });

  // Test message states
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test message from Great Pearl Coffee System.');
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['sms_provider', 'sendgrid_configured', 'twilio_configured']);

      if (error) throw error;

      data?.forEach(setting => {
        if (setting.setting_key === 'sms_provider') {
          setSmsProvider(String(setting.setting_value) || 'yoola');
        }
        if (setting.setting_key === 'sendgrid_configured') {
          setProviderStatus(prev => ({ ...prev, sendgrid: String(setting.setting_value) === 'true' }));
        }
        if (setting.setting_key === 'twilio_configured') {
          setProviderStatus(prev => ({ ...prev, twilio: String(setting.setting_value) === 'true' }));
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await supabase
        .from('system_settings')
        .upsert({ setting_key: 'sms_provider', setting_value: smsProvider }, { onConflict: 'setting_key' });

      toast({
        title: 'Settings Saved',
        description: 'Messaging provider settings have been updated.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async (channel: 'email' | 'sms' | 'whatsapp') => {
    const to = channel === 'email' ? testEmail : testPhone;
    
    if (!to) {
      toast({
        title: 'Missing Recipient',
        description: `Please enter a ${channel === 'email' ? 'email address' : 'phone number'}.`,
        variant: 'destructive'
      });
      return;
    }

    setSendingTest(channel);
    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          channel,
          to,
          subject: channel === 'email' ? 'Test Email from Great Pearl Coffee' : undefined,
          message: testMessage
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test Sent',
          description: `Test ${channel} message sent successfully!`
        });
      } else {
        throw new Error(data?.error || 'Failed to send test message');
      }
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSendingTest(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Provider Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messaging Providers
          </CardTitle>
          <CardDescription>
            Configure which providers to use for emails, SMS, and WhatsApp messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SendGrid Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">SendGrid</span>
                </div>
                <Badge variant={providerStatus.sendgrid ? 'default' : 'secondary'}>
                  {providerStatus.sendgrid ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Email sending</p>
            </div>

            {/* Twilio Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-red-500" />
                  <span className="font-medium">Twilio</span>
                </div>
                <Badge variant={providerStatus.twilio ? 'default' : 'secondary'}>
                  {providerStatus.twilio ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">SMS & WhatsApp</p>
            </div>

            {/* Yoola Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Yoola SMS</span>
                </div>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" /> Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">SMS (Current)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Provider</CardTitle>
          <CardDescription>
            Choose which provider to use for sending SMS messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={smsProvider} onValueChange={setSmsProvider}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yoola" id="yoola" />
              <Label htmlFor="yoola" className="flex items-center gap-2">
                Yoola SMS
                <Badge variant="outline">Current</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="twilio" id="twilio" disabled={!providerStatus.twilio} />
              <Label htmlFor="twilio" className={`flex items-center gap-2 ${!providerStatus.twilio ? 'opacity-50' : ''}`}>
                Twilio
                {!providerStatus.twilio && <Badge variant="secondary">Setup Required</Badge>}
              </Label>
            </div>
          </RadioGroup>

          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save SMS Provider
          </Button>
        </CardContent>
      </Card>

      {/* Test Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Messages
          </CardTitle>
          <CardDescription>
            Send test messages to verify your messaging configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Test Message Content</Label>
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter your test message..."
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Test */}
            <div className="space-y-2">
              <Label>Test Email</Label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button 
                onClick={() => sendTestMessage('email')} 
                disabled={sendingTest === 'email'}
                className="w-full"
                variant="outline"
              >
                {sendingTest === 'email' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Send Test Email
              </Button>
            </div>

            {/* SMS Test */}
            <div className="space-y-2">
              <Label>Test SMS</Label>
              <Input
                type="tel"
                placeholder="0779123456"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button 
                onClick={() => sendTestMessage('sms')} 
                disabled={sendingTest === 'sms'}
                className="w-full"
                variant="outline"
              >
                {sendingTest === 'sms' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Send Test SMS
              </Button>
            </div>

            {/* WhatsApp Test */}
            <div className="space-y-2">
              <Label>Test WhatsApp</Label>
              <Input
                type="tel"
                placeholder="0779123456"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={!providerStatus.twilio}
              />
              <Button 
                onClick={() => sendTestMessage('whatsapp')} 
                disabled={sendingTest === 'whatsapp' || !providerStatus.twilio}
                className="w-full"
                variant="outline"
              >
                {sendingTest === 'whatsapp' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                Send Test WhatsApp
              </Button>
              {!providerStatus.twilio && (
                <p className="text-xs text-muted-foreground">Requires Twilio setup</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">SendGrid (Email) ✓ Configured</h4>
            <p className="text-sm text-muted-foreground">
              Your SendGrid API key is configured. Emails will be sent via SendGrid.
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Twilio (SMS & WhatsApp)</h4>
            <p className="text-sm text-muted-foreground mb-2">
              To enable Twilio for SMS and WhatsApp, you need to add these secrets:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>TWILIO_ACCOUNT_SID</li>
              <li>TWILIO_AUTH_TOKEN</li>
              <li>TWILIO_PHONE_NUMBER (for SMS)</li>
              <li>TWILIO_WHATSAPP_NUMBER (for WhatsApp)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagingSettings;
