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

  const checkAuthUser = async () => {
    try {
      setLoading(true);
      
      // Check if auth user exists
      const { data: employee } = await supabase
        .from('employees')
        .select('auth_user_id, email, name, status')
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
        description: `${employee.name} - Status: ${employee.status} - Auth ID: ${employee.auth_user_id}`,
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

        <div className="grid grid-cols-2 gap-2">
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
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Current Issue:</strong> Shafik unable to login</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Expected Password:</strong> Yeda1234</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PasswordResetHelper;