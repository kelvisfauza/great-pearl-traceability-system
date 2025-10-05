import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        setIsRegistering(true);
        setIsVerifying(false);
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

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Great Pearl Coffee Factory',
            id: window.location.hostname
          },
          user: {
            id: new Uint8Array(16),
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

          <Button 
            onClick={onCancel} 
            variant="outline"
            className="w-full"
          >
            Go Back to Login
          </Button>
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

          <div className="space-y-4">
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

        <div className="space-y-4">
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
            onClick={onCancel} 
            variant="outline"
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
