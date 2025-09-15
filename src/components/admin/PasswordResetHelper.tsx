import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Mail, RefreshCw } from 'lucide-react';

const PasswordResetHelper = () => {
  const [email, setEmail] = useState('shafikahmed20051@gmail.com');
  const [phone, setPhone] = useState('+256');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Password Reset Sent",
        description: `Password reset email sent to ${email}. Check the inbox and spam folder.`,
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error", 
        description: "Failed to send password reset email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePhoneNumber = async () => {
    if (!phone || phone.length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('employees')
        .update({ 
          phone: phone,
          bypass_sms_verification: false // Ensure SMS verification is required
        })
        .eq('email', email);

      if (error) {
        console.error('Update phone error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Phone Updated",
        description: `Phone number ${phone} added to ${email}. SMS verification will now work.`,
      });

    } catch (error: any) {
      console.error('Update phone error:', error);
      toast({
        title: "Error",
        description: "Failed to update phone number",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const enableSMSBypass = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('employees')
        .update({ bypass_sms_verification: true })
        .eq('email', email);

      if (error) {
        console.error('Enable bypass error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "SMS Bypass Enabled",
        description: `${email} can now login without SMS verification.`,
      });

    } catch (error: any) {
      console.error('Enable bypass error:', error);
      toast({
        title: "Error",
        description: "Failed to enable SMS bypass",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAuthUser = async () => {
    try {
      setLoading(true);
      
      // Check if auth user exists
      const { data: employee } = await supabase
        .from('employees')
        .select('auth_user_id, email, name, status, phone, bypass_sms_verification')
        .eq('email', email)
        .single();

      if (!employee) {
        toast({
          title: "User Not Found",
          description: "No employee found with this email",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "User Found",
        description: `${employee.name} - Status: ${employee.status} - Phone: ${employee.phone || 'None'} - SMS Bypass: ${employee.bypass_sms_verification}`,
      });

    } catch (error: any) {
      console.error('Check user error:', error);
      toast({
        title: "Error",
        description: "Failed to check user status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Password Reset Helper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={checkAuthUser}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Check User
          </Button>

          <Button
            onClick={handlePasswordReset}
            disabled={loading}
            size="sm"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Reset Password
          </Button>

          <Button
            onClick={enableSMSBypass}
            disabled={loading}
            variant="secondary"
            size="sm"
          >
            Skip SMS
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Current Issue:</strong> Shafik unable to login</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Expected Password:</strong> Yeda1234</p>
          <p><strong>Problem:</strong> No phone number for SMS verification</p>
        </div>

        <div className="space-y-2">
          <Label>Quick Fix: Add Phone Number</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="Enter phone number" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={updatePhoneNumber}
              disabled={loading}
            >
              Update Phone
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PasswordResetHelper;