import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Shield, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TwoFactorVerificationProps {
  email: string;
  phone: string;
  onVerificationComplete: () => void;
  onCancel: () => void;
}

const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  email,
  phone,
  onVerificationComplete,
  onCancel
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(21600); // 6 hours = 21600 seconds
  const [canResend, setCanResend] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const hasSentInitialCode = React.useRef(false);

  // Auto-send code when component loads (check bypass first)
  useEffect(() => {
    if (!hasSentInitialCode.current && !isSendingCode) {
      hasSentInitialCode.current = true;
      console.log('🎯 Auto-sending initial verification code...');
      sendVerificationCode();
    }
  }, [email, phone]);

  // Listen for auto-fill events from SMS links
  React.useEffect(() => {
    const handleAutoFill = (event: CustomEvent) => {
      const { code } = event.detail;
      console.log('🔗 Auto-filling code from SMS link:', code);
      setVerificationCode(code);
      // Auto-verify after a short delay
      setTimeout(() => verifyCode(), 100);
    };

    window.addEventListener('autoFillCode', handleAutoFill as EventListener);
    return () => window.removeEventListener('autoFillCode', handleAutoFill as EventListener);
  }, []);

  // Start countdown timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Listen for auto-fill events from SMS links
  React.useEffect(() => {
    const handleAutoFill = (event: CustomEvent) => {
      const { code } = event.detail;
      console.log('🔗 Auto-filling code from SMS link:', code);
      setVerificationCode(code);
      // Auto-verify after a short delay
      setTimeout(async () => {
        console.log('🔍 Auto-verifying code from SMS link');
        if (code && code.length === 5) {
          setIsVerifying(true);
          setError('');

          try {
            const { data, error } = await supabase.functions.invoke('2fa-verification', {
              body: {
                action: 'verify_code',
                email,
                phone,
                code: code
              }
            });

            if (error) throw error;
            
            // Check for bypass response
            if (data?.bypassed) {
              console.log('✅ SMS bypass enabled - verification completed');
              onVerificationComplete();
              return;
            }
            
            if (!data?.success) throw new Error(data?.error || 'Invalid verification code');

            console.log('✅ Auto-verification successful!');
            onVerificationComplete();
          } catch (err: any) {
            console.error('Auto-verify code error:', err);
            setError(err.message || 'Auto-verification failed');
          } finally {
            setIsVerifying(false);
          }
        }
      }, 500);
    };

    window.addEventListener('autoFillCode', handleAutoFill as EventListener);
    return () => window.removeEventListener('autoFillCode', handleAutoFill as EventListener);
  }, [email, phone, onVerificationComplete]);

  // Format time remaining (handles hours, minutes, seconds)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendVerificationCode = async () => {
    if (isSendingCode) {
      console.log('🚫 Already sending code, skipping duplicate request');
      return;
    }

    setIsSendingCode(true);
    setError('');

    try {
      console.log('📱 Sending verification code to:', { email, phone });
      const { data, error } = await supabase.functions.invoke('2fa-verification', {
        body: {
          action: 'send_code',
          email,
          phone
        }
      });

      if (error) throw error;

      // Check for bypass response first
      if (data?.bypassed) {
        console.log('✅ SMS bypass enabled - verification not required');
        setBypassEnabled(true);
        onVerificationComplete();
        return;
      }

      // Check if existing code was used (no new SMS sent)
      if (data?.existingCodeUsed) {
        console.log('📋 Using existing verification code - no new SMS sent');
        setCodeSent(true);
        setError(''); // Clear any previous errors
        // Set timer based on when code expires
        if (data.expiresIn) {
          setTimeRemaining(data.expiresIn * 60); // Convert minutes to seconds
        }
        setCanResend(false);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      console.log('✅ New verification code sent successfully');
      setCodeSent(true);
      // Reset timer to 6 hours
      setTimeRemaining(21600);
      setCanResend(false);
    } catch (err: any) {
      console.error('Send code error:', err);
      const errorMessage = err.message || 'Failed to send verification code';
      setError(errorMessage);
      
      // Check if it's the 6-hour rate limit error
      if (errorMessage.includes('once every 6 hours') || errorMessage.includes('contact IT department')) {
        setRateLimited(true);
        setCanResend(false);
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    console.log('🔍 Verification attempt:', { 
      email, 
      phone, 
      codeLength: verificationCode.length,
      code: verificationCode 
    });
    
    if (!verificationCode || verificationCode.length !== 5) {
      setError('Please enter a valid 5-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      console.log('📞 Calling 2FA verification function...');
      const { data, error } = await supabase.functions.invoke('2fa-verification', {
        body: {
          action: 'verify_code',
          email,
          phone,
          code: verificationCode
        }
      });

      console.log('📞 2FA Response:', { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }

      // Check for bypass response
      if (data?.bypassed) {
        console.log('✅ SMS bypass enabled - verification completed');
        onVerificationComplete();
        return;
      }

      if (!data?.success) {
        console.error('❌ Verification failed:', data);
        throw new Error(data?.error || 'Invalid verification code');
      }

      console.log('✅ Verification successful!');
      onVerificationComplete();
    } catch (err: any) {
      console.error('Verify code error:', err);
      
      // Parse error message to show specific error types
      let errorMessage = err.message || 'Verification failed';
      
      if (errorMessage.includes('expired')) {
        errorMessage = 'Code expired. Please request a new code.';
      } else if (errorMessage.includes('Invalid verification code')) {
        errorMessage = 'Wrong code. Please try again.';
      } else if (errorMessage.includes('Too many failed attempts')) {
        errorMessage = 'Too many attempts. Please request a new code.';
      } else if (errorMessage.includes('No verification code found')) {
        errorMessage = 'No code found. Please request a new code.';
      }
      
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };


  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-xl">Phone Verification</CardTitle>
        <CardDescription>
          {rateLimited ? (
            <>
              Please use the 5-digit code from your previous SMS to<br />
              <strong>{phone}</strong>
            </>
          ) : codeSent ? (
            <>
              A verification code was sent to<br />
              <strong>{phone}</strong>
              <p className="text-sm text-muted-foreground mt-2">
                📱 Check your SMS - the code is valid for 6 hours
              </p>
            </>
          ) : (
            <>Sending verification code to {phone}...</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={5}
              value={verificationCode}
              onChange={(value) => {
                setVerificationCode(value);
                setError('');
                // Auto-verify when 5 digits are entered
                if (value.length === 5) {
                  setTimeout(() => verifyCode(), 100);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && verificationCode.length === 5) {
                  verifyCode();
                }
              }}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button 
            onClick={verifyCode} 
            className="w-full" 
            disabled={isVerifying || verificationCode.length !== 5}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          <div className="text-center space-y-2">
            {rateLimited ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800 font-medium">
                  ⏰ Code Already Sent
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Please use the verification code that was already sent to your phone (valid for 6 hours).
                </p>
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  📱 Check your SMS messages for the 5-digit code
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  If you can't find the code, contact the IT department for assistance.
                </p>
              </div>
            ) : !canResend ? (
              <p className="text-sm text-gray-600">
                Code expires in <strong>{formatTime(timeRemaining)}</strong>
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={sendVerificationCode}
                disabled={isSendingCode}
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwoFactorVerification;
