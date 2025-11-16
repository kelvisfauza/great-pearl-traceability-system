import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: () => void;
  onCancel: () => void;
}

export const EmailVerification = ({ email, onVerificationComplete, onCancel }: EmailVerificationProps) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();

  // Send initial verification code
  useEffect(() => {
    sendVerificationCode();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    setIsSendingCode(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { 
          email,
          action: 'send_code'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Code Sent",
          description: "A 4-digit verification code has been sent to your email.",
        });
        setCountdown(60);
        setCanResend(false);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 4) {
      setError('Please enter a 4-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { 
          email,
          action: 'verify_code',
          code
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Email Verified",
          description: "Your email has been verified successfully!",
        });
        onVerificationComplete();
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 4) {
      verifyCode();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Verify Your Email</CardTitle>
        <CardDescription className="text-center">
          We've sent a 4-digit code to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium">
            Verification Code
          </label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter 4-digit code"
            value={code}
            onChange={handleCodeChange}
            onKeyPress={handleKeyPress}
            disabled={isVerifying}
            className="text-center text-2xl tracking-widest"
            maxLength={4}
            autoFocus
          />
        </div>

        <Button
          onClick={verifyCode}
          disabled={isVerifying || code.length !== 4}
          className="w-full"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Verify Email
            </>
          )}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          <Button
            variant="outline"
            onClick={sendVerificationCode}
            disabled={!canResend || isSendingCode}
            className="w-full"
          >
            {isSendingCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : canResend ? (
              'Resend Code'
            ) : (
              `Resend in ${countdown}s`
            )}
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full"
          disabled={isVerifying || isSendingCode}
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};
