import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, AlertCircle, CheckCircle2, Fingerprint, Calendar, MessageSquare, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type VerificationMethod = 'email' | 'sms' | 'biometric' | 'dob';

interface UnifiedVerificationProps {
  email: string;
  onVerificationComplete: () => void;
  onCancel: () => void;
}

export const UnifiedVerification = ({ email, onVerificationComplete, onCancel }: UnifiedVerificationProps) => {
  const [method, setMethod] = useState<VerificationMethod>('email');
  const [code, setCode] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);
  const [smsFailed, setSmsFailed] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const { toast } = useToast();

  // Send email code on mount
  useEffect(() => {
    sendEmailCode();
    checkBiometric();
  }, []);

  // Countdown
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown]);

  const checkBiometric = async () => {
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          const { data: credential } = await supabase
            .from('biometric_credentials')
            .select('credential_id')
            .eq('email', email)
            .maybeSingle();
          setIsBiometricAvailable(!!credential);
        }
      }
    } catch { /* ignore */ }
  };

  const sendEmailCode = async () => {
    setIsSending(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { email, action: 'send_code' }
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Code Sent", description: "A 4-digit code has been sent to your email." });
        setCountdown(60);
        setCanResend(false);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch {
      setError('Failed to send email code.');
    } finally {
      setIsSending(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!code || code.length !== 4) { setError('Enter a 4-digit code'); return; }
    setIsVerifying(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { email, action: 'verify_code', code }
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Verified!", description: "Identity verified successfully." });
        onVerificationComplete();
      } else {
        setError(data?.error || 'Invalid code');
      }
    } catch {
      setError('Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const startBiometricAuth = async () => {
    setIsVerifying(true);
    setError('');
    try {
      const { data: credential } = await supabase
        .from('biometric_credentials')
        .select('credential_id')
        .eq('email', email)
        .maybeSingle();

      if (!credential) {
        setError('No biometric registered. Try another method.');
        setBiometricFailed(true);
        setIsVerifying(false);
        return;
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: [{
            id: Uint8Array.from(atob(credential.credential_id), c => c.charCodeAt(0)),
            type: 'public-key',
            transports: ['internal'],
          }],
        },
      });
      if (assertion) {
        toast({ title: "Verified!", description: "Biometric verified." });
        onVerificationComplete();
      }
    } catch (err: any) {
      setBiometricFailed(true);
      setError('Biometric failed. Try another method.');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyDob = async () => {
    if (!dobInput) { setError('Please enter your date of birth'); return; }
    setIsVerifying(true);
    setError('');
    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('date_of_birth')
        .eq('email', email)
        .maybeSingle();

      if (!employee?.date_of_birth) {
        setError('Date of birth not on file. Contact IT support.');
        setIsVerifying(false);
        return;
      }

      // Compare dates (normalize to YYYY-MM-DD)
      const storedDob = new Date(employee.date_of_birth).toISOString().split('T')[0];
      const inputDob = new Date(dobInput).toISOString().split('T')[0];

      if (storedDob === inputDob) {
        toast({ title: "Verified!", description: "Identity confirmed via date of birth." });
        onVerificationComplete();
      } else {
        setError('Date of birth does not match our records.');
      }
    } catch {
      setError('Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
    setError('');
  };

  const switchMethod = (newMethod: VerificationMethod) => {
    setMethod(newMethod);
    setError('');
    setCode('');
    setDobInput('');
    if (newMethod === 'email') {
      setEmailFailed(true);
    }
  };

  const methodIcon = {
    email: <Mail className="h-8 w-8 text-primary" />,
    sms: <MessageSquare className="h-8 w-8 text-primary" />,
    biometric: <Fingerprint className="h-8 w-8 text-primary" />,
    dob: <Calendar className="h-8 w-8 text-primary" />,
  };

  const methodTitle = {
    email: 'Email Verification',
    sms: 'SMS Verification',
    biometric: 'Biometric Verification',
    dob: 'Date of Birth Verification',
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            {methodIcon[method]}
          </div>
        </div>
        <CardTitle className="text-xl text-center">{methodTitle[method]}</CardTitle>
        <CardDescription className="text-center text-xs">
          {method === 'email' && <>We've sent a 4-digit code to <strong>{email}</strong></>}
          {method === 'sms' && 'Enter the SMS code sent to your phone'}
          {method === 'biometric' && 'Use fingerprint or face ID to verify'}
          {method === 'dob' && 'Enter your date of birth to verify your identity'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* EMAIL METHOD */}
        {method === 'email' && (
          <>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Enter 4-digit code"
              value={code}
              onChange={handleCodeChange}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 4 && verifyEmailCode()}
              disabled={isVerifying}
              className="text-center text-2xl tracking-widest"
              maxLength={4}
              autoFocus
            />
            <Button onClick={verifyEmailCode} disabled={isVerifying || code.length !== 4} className="w-full">
              {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Verify</>}
            </Button>
            <Button variant="outline" onClick={sendEmailCode} disabled={!canResend || isSending} className="w-full text-xs">
              {isSending ? 'Sending...' : canResend ? 'Resend Code' : `Resend in ${countdown}s`}
            </Button>
          </>
        )}

        {/* BIOMETRIC METHOD */}
        {method === 'biometric' && (
          <Button onClick={startBiometricAuth} disabled={isVerifying} className="w-full" size="lg">
            {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : <><Fingerprint className="mr-2 h-5 w-5" />Authenticate</>}
          </Button>
        )}

        {/* DOB METHOD */}
        {method === 'dob' && (
          <>
            <Input
              type="date"
              value={dobInput}
              onChange={(e) => { setDobInput(e.target.value); setError(''); }}
              disabled={isVerifying}
              className="text-center"
              autoFocus
            />
            <Button onClick={verifyDob} disabled={isVerifying || !dobInput} className="w-full">
              {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : <><ShieldCheck className="mr-2 h-4 w-4" />Verify Identity</>}
            </Button>
          </>
        )}

        {/* FALLBACK OPTIONS */}
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs text-muted-foreground text-center">Having trouble? Try another method:</p>
          <div className="flex flex-col gap-1.5">
            {method !== 'email' && (
              <Button variant="ghost" size="sm" onClick={() => { switchMethod('email'); sendEmailCode(); }} className="w-full text-xs justify-start">
                <Mail className="mr-2 h-3.5 w-3.5" /> Email verification code
              </Button>
            )}
            {method !== 'biometric' && isBiometricAvailable && !biometricFailed && (
              <Button variant="ghost" size="sm" onClick={() => switchMethod('biometric')} className="w-full text-xs justify-start">
                <Fingerprint className="mr-2 h-3.5 w-3.5" /> Fingerprint / Face ID
              </Button>
            )}
            {method !== 'dob' && (
              <Button variant="ghost" size="sm" onClick={() => switchMethod('dob')} className="w-full text-xs justify-start">
                <Calendar className="mr-2 h-3.5 w-3.5" /> Date of birth
              </Button>
            )}
          </div>
        </div>

        <Button variant="ghost" onClick={onCancel} className="w-full text-xs" disabled={isVerifying}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};
