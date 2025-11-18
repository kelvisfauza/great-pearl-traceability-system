import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Fingerprint, Loader2, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { verificationCodeSchema } from '@/lib/validations';
import { ZodError } from 'zod';

interface BiometricVerificationProps {
  email: string;
  onVerificationComplete: () => void;
  onCancel: () => void;
}

const BiometricVerification: React.FC<BiometricVerificationProps> = ({
  email,
  onVerificationComplete,
  onCancel
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean | null>(null);
  const [useVerificationCode, setUseVerificationCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    // Check if biometric is available on this device
    const checkBiometricAvailability = async () => {
      if (!window.PublicKeyCredential) {
        setIsBiometricAvailable(false);
        setError('This device does not support biometric authentication. Please use a device with fingerprint or face ID capabilities.');
        return;
      }

      try {
        // Check if platform authenticator is available (fingerprint, face ID, etc.)
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsBiometricAvailable(available);
        
        if (!available) {
          setError('No biometric sensor detected on this device. Please use a device with fingerprint or face ID capabilities.');
        }
      } catch (err) {
        console.error('Error checking biometric availability:', err);
        setIsBiometricAvailable(false);
        setError('Unable to detect biometric capabilities on this device.');
      }
    };

    checkBiometricAvailability();
  }, []);

  const startBiometricAuth = async () => {
    if (!isBiometricAvailable) {
      setError('Biometric authentication is not available on this device.');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');

      // Check if user has registered biometric credential
      const { data: credential } = await supabase
        .from('biometric_credentials')
        .select('credential_id')
        .eq('email', email)
        .single();

      if (!credential) {
        // No credential registered, prompt to register
        console.log('⚠️ No biometric credential found for user, switching to registration');
        setIsRegistering(true);
        setIsVerifying(false);
        toast.info('No fingerprint registered yet. Please register now.');
        return;
      }

      // Get challenge from server (in production, this should be a server-generated challenge)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Request biometric authentication
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            id: Uint8Array.from(atob(credential.credential_id), c => c.charCodeAt(0)),
            type: 'public-key',
            transports: ['internal']
          }],
          timeout: 60000,
          userVerification: 'required'
        }
      }) as PublicKeyCredential;

      if (assertion) {
        console.log('✅ Biometric authentication successful');
        toast.success('Biometric authentication successful!');
        onVerificationComplete();
      }
    } catch (err: any) {
      console.error('Biometric authentication error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled. Please try again or contact IT support.');
      } else if (err.name === 'InvalidStateError') {
        setError('No biometric credentials found. Please register first.');
        setIsRegistering(true);
      } else if (err.name === 'NotSupportedError') {
        setError('Your device does not support biometric authentication.');
      } else {
        setError(`Authentication failed: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const registerBiometric = async () => {
    if (!isBiometricAvailable) {
      setError('Biometric authentication is not available on this device.');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');

      console.log('🔐 Starting biometric registration for:', email);
      console.log('🌐 Current hostname:', window.location.hostname);

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Generate a proper user ID from email
      const userId = new TextEncoder().encode(email.substring(0, 16).padEnd(16, '0'));

      // For WebAuthn, localhost and lovable domains need special handling
      const hostname = window.location.hostname;
      let rpId = hostname;
      
      // For localhost, use 'localhost'. For lovable previews, use the full hostname
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        rpId = 'localhost';
      }

      console.log('🔑 Using RP ID:', rpId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Great Pearl Coffee Factory',
            id: rpId
          },
          user: {
            id: userId,
            name: email,
            displayName: email
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'none'
        }
      }) as PublicKeyCredential;

      if (credential) {
        // Store credential in database
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        
        await supabase.from('biometric_credentials').upsert({
          email: email,
          credential_id: credentialId,
          created_at: new Date().toISOString()
        });

        console.log('✅ Biometric credential registered');
        toast.success('Biometric authentication registered successfully!');
        setIsRegistering(false);
        
        // Now authenticate with the newly registered credential
        startBiometricAuth();
      }
    } catch (err: any) {
      console.error('Biometric registration error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Registration was cancelled. Please try again when ready.');
      } else if (err.name === 'NotSupportedError') {
        setError('Your device does not support this type of biometric authentication.');
      } else {
        setError(`Registration failed: ${err.message || 'Please try again or contact IT support.'}`);
      }
      setIsVerifying(false);
    }
  };

  const sendVerificationCode = async () => {
    try {
      setIsSendingCode(true);
      setError('');

      // Get employee info
      const { data: employee } = await supabase
        .from('employees')
        .select('name, phone')
        .eq('email', email)
        .single();

      if (!employee?.phone) {
        setError('No phone number found for this account. Please contact IT support.');
        return;
      }

      // Generate verification code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Validate data using zod
      const validatedData = verificationCodeSchema.parse({
        email: email,
        phone: employee.phone,
        code: code,
      });
      
      // Store in database
      await supabase.from('verification_codes').insert({
        email: validatedData.email,
        phone: validatedData.phone,
        code: validatedData.code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });

      // Send SMS
      const { error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: employee.phone,
          message: `Your Great Pearl verification code is: ${code}. Valid for 10 minutes.`,
          userName: employee.name,
          messageType: 'verification_code'
        }
      });

      if (smsError) throw smsError;

      setCodeSent(true);
      toast.success('Verification code sent to your phone');
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(`Failed to send code: ${err.message || 'Please try again'}`);
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    try {
      setIsVerifying(true);
      setError('');

      if (!verificationCode || verificationCode.length !== 4) {
        setError('Please enter a valid 4-digit code');
        setIsVerifying(false);
        return;
      }

      // Verify code from database
      const { data: storedCode, error: codeError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', verificationCode)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (codeError || !storedCode) {
        setError('Invalid or expired verification code');
        setIsVerifying(false);
        return;
      }

      // Delete used code
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', storedCode.id);

      toast.success('Verification successful!');
      onVerificationComplete();
    } catch (err: any) {
      console.error('Verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Show device not supported message
  if (isBiometricAvailable === false) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-fit">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle>Biometric Not Available</CardTitle>
          <CardDescription>
            Your device does not support biometric authentication or no fingerprint sensor was detected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>To use biometric authentication, you need:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>A device with a fingerprint sensor or Face ID</li>
              <li>Biometric authentication enabled in your device settings</li>
              <li>A modern browser that supports WebAuthn</li>
            </ul>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Note:</strong> Biometric authentication is required for all administrator accounts for security purposes.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button 
              onClick={() => setUseVerificationCode(true)} 
              variant="default"
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Use Verification Code Instead
            </Button>
            
            <Button 
              onClick={onCancel} 
              variant="outline"
              className="w-full"
            >
              Go Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRegistering) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
            <Fingerprint className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>Register Biometric Authentication</CardTitle>
          <CardDescription>
            You haven't registered fingerprint authentication yet. Register now for secure admin access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ✓ Biometric sensor detected on your device
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>First time setup:</strong> Place your finger on the sensor when prompted to register your fingerprint for secure access.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button 
              onClick={registerBiometric} 
              disabled={isVerifying || !isBiometricAvailable}
              className="w-full"
              size="lg"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Fingerprint className="h-5 w-5 mr-2" />
                  Register Fingerprint
                </>
              )}
            </Button>

            <Button 
              onClick={onCancel} 
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verification code view
  if (useVerificationCode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
            <MessageSquare className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>SMS Verification</CardTitle>
          <CardDescription>
            We'll send a verification code to your registered phone number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!codeSent ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  A 4-digit verification code will be sent to your phone via SMS
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button 
                  onClick={sendVerificationCode} 
                  disabled={isSendingCode}
                  className="w-full"
                  size="lg"
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => setUseVerificationCode(false)} 
                  variant="outline"
                  className="w-full"
                >
                  Back to Biometric
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Verification code sent! Check your phone.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Enter 4-digit code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={verifyCode} 
                  disabled={isVerifying || verificationCode.length !== 4}
                  className="w-full"
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <Button 
                  onClick={sendVerificationCode} 
                  disabled={isSendingCode}
                  variant="outline"
                  className="w-full"
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>

                <Button 
                  onClick={() => {
                    setUseVerificationCode(false);
                    setCodeSent(false);
                    setVerificationCode('');
                  }} 
                  variant="ghost"
                  className="w-full"
                >
                  Back to Biometric
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
          <Fingerprint className="h-12 w-12 text-green-600" />
        </div>
        <CardTitle>Admin Biometric Verification</CardTitle>
        <CardDescription>
          Use your fingerprint or face ID to verify your identity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isBiometricAvailable === null && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Checking device capabilities...</AlertDescription>
          </Alert>
        )}

        {isBiometricAvailable && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ✓ Biometric sensor detected on your device
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button 
            onClick={startBiometricAuth} 
            disabled={isVerifying || !isBiometricAvailable || isBiometricAvailable === null}
            className="w-full"
            size="lg"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Fingerprint className="h-5 w-5 mr-2" />
                Authenticate with Biometric
              </>
            )}
          </Button>

          <Button 
            onClick={() => setUseVerificationCode(true)} 
            variant="outline"
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Use Verification Code Instead
          </Button>

          <Button 
            onClick={onCancel} 
            variant="ghost"
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your biometric data never leaves your device and is used only for authentication.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default BiometricVerification;
