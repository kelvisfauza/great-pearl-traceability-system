import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function TestSMSPanel() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('This is a test message from Great Pearl Coffee Management System. SMS service is working properly!');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendTestSMS = async () => {
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      console.log('Sending test SMS to:', phone);
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: phone.trim(),
          message: message.trim(),
          userName: 'Test User'
        }
      });

      if (error) {
        console.error('SMS error:', error);
        toast({
          title: "SMS Test Failed",
          description: error.message || "Failed to send test SMS",
          variant: "destructive"
        });
      } else if (data.success) {
        console.log('Test SMS sent successfully:', data);
        toast({
          title: "SMS Test Successful!",
          description: `Test SMS sent successfully to ${data.phone} via ${data.provider}`
        });
      } else {
        console.error('SMS sending failed:', data);
        toast({
          title: "SMS Test Failed",
          description: data.error || "Failed to send test SMS",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "SMS Test Failed",
        description: error.message || "Failed to send test SMS",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Test SMS Service
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="testPhone">Phone Number</Label>
          <Input
            id="testPhone"
            type="tel"
            placeholder="+256 700 000 000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="testMessage">Test Message</Label>
          <Textarea
            id="testMessage"
            placeholder="Enter your test message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSendTestSMS} 
          disabled={isSending}
          className="w-full"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test SMS
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}