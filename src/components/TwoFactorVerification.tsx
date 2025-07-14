
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Shield, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorVerificationProps {
  phone: string;
  userName?: string;
  onVerificationSuccess: () => void;
  onCancel: () => void;
}

const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  phone,
  userName,
  onVerificationSuccess,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [storedCode, setStoredCode] = useState<string>('');
  const { toast } = useToast();

  // Generate and send initial code
  useEffect(() => {
    sendVerificationCode();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const generateCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const sendVerificationCode = async () => {
    setIsSending(true);
    const newCode = generateCode();
    setStoredCode(newCode);
    
    try {
      const response = await fetch(`https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk`
        },
        body: JSON.stringify({
          phone: phone,
          code: newCode,
          userName: userName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      toast({
        title: "Verification code sent",
        description: `A 4-digit code has been sent to ${phone}`,
      });

      setTimeRemaining(300); // Reset timer to 5 minutes
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerification = async () => {
    if (code.length !== 4) {
      toast({
        title: "Invalid code",
        description: "Please enter a 4-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Check if code matches and hasn't expired
      if (code === storedCode && timeRemaining > 0) {
        toast({
          title: "Verification successful",
          description: "You have been successfully verified!",
        });
        onVerificationSuccess();
      } else if (timeRemaining <= 0) {
        toast({
          title: "Code expired",
          description: "The verification code has expired. Please request a new one.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invalid code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: "Verification failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-12 w-12 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
        <CardDescription>
          {userName ? `Hello ${userName}, enter` : 'Enter'} the 4-digit code sent to {maskedPhone}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <InputOTP
            maxLength={4}
            value={code}
            onChange={(value) => setCode(value)}
            onComplete={handleVerification}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Code expires in: <span className="font-mono text-red-600">{formatTime(timeRemaining)}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleVerification} 
            className="w-full" 
            disabled={code.length !== 4 || isVerifying}
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Code
          </Button>

          <Button
            variant="outline"
            onClick={sendVerificationCode}
            className="w-full"
            disabled={isSending || timeRemaining > 240} // Allow resend after 1 minute
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RotateCcw className="mr-2 h-4 w-4" />
            {timeRemaining > 240 ? `Resend in ${formatTime(300 - timeRemaining)}` : 'Resend Code'}
          </Button>

          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>Didn't receive the code? Check your phone or try resending.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwoFactorVerification;
