import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, CheckCircle2, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const toBase64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

/**
 * Enrols this device's fingerprint (WebAuthn platform authenticator) so the
 * user can sign in from the login screen without a password.
 */
const FingerprintEnrollment: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<{ created_at: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [inIframe, setInIframe] = useState(false);

  const email = user?.email?.toLowerCase() ?? '';

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
    const check = async () => {
      if (!window.PublicKeyCredential) return setSupported(false);
      try {
        setSupported(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
      } catch {
        setSupported(false);
      }
    };
    check();
  }, []);

  const refresh = async () => {
    if (!email) return setLoading(false);
    setLoading(true);
    const { data } = await supabase
      .from('biometric_credentials')
      .select('created_at')
      .ilike('email', email)
      .maybeSingle();
    setExisting((data as any) || null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const enrol = async () => {
    if (!email) return;
    setBusy(true);
    try {
      if (!window.isSecureContext) {
        throw new Error('Fingerprint sign-in needs a secure (https) connection.');
      }
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Great Agro Coffee', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(email.substring(0, 32).padEnd(16, '0')),
            name: email,
            displayName: email,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error('No fingerprint captured.');

      const credentialId = toBase64(credential.rawId);

      // Replace any previous credential for this email (avoids ON CONFLICT
      // ambiguity from the multiple unique indexes on email).
      await supabase.from('biometric_credentials').delete().ilike('email', email);
      const { error } = await supabase
        .from('biometric_credentials')
        .insert({ email, credential_id: credentialId });
      if (error) throw error;

      toast({
        title: 'Fingerprint enrolled',
        description: 'You can now sign in with your fingerprint on this device.',
      });
      await refresh();
    } catch (err: any) {
      console.error('Fingerprint enrolment failed:', err);
      const name = err?.name;
      const description =
        name === 'NotAllowedError'
          ? inIframe
            ? 'The browser blocked the fingerprint prompt inside the preview frame. Open the app in its own browser tab and try again.'
            : 'The fingerprint prompt was cancelled or timed out. Please try again.'
          : name === 'SecurityError'
            ? 'This page origin is not allowed to use fingerprints. Open the app in its own browser tab and try again.'
            : name === 'NotSupportedError'
              ? 'This device or browser does not support fingerprint sign-in.'
              : name === 'InvalidStateError'
                ? 'A fingerprint is already registered on this device for your account.'
                : err?.message || 'Could not register your fingerprint.';
      toast({ title: 'Enrolment failed', description, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!email) return;
    if (!confirm('Remove your enrolled fingerprint? You will need to enrol again to use it.')) return;
    const { error } = await supabase.from('biometric_credentials').delete().ilike('email', email);
    if (error) {
      toast({ title: 'Removal failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fingerprint removed' });
    await refresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Fingerprint className="h-5 w-5 text-primary" />
              Fingerprint Sign-in
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Enrol your fingerprint once on this device, then open your account from the sign-in
              screen with a single touch — no password needed.
            </CardDescription>
          </div>
          {existing && (
            <Badge variant="secondary" className="gap-1 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Enrolled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {supported === false && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              This device has no fingerprint sensor available to the browser. Use a phone or laptop
              with a fingerprint reader.
            </AlertDescription>
          </Alert>
        )}
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your fingerprint never leaves your device — only a device key reference is stored.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : existing ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={enrol} disabled={busy || supported === false} className="flex-1">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
              Re-enrol on this device
            </Button>
            <Button onClick={remove} variant="outline" className="flex-1 text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </Button>
          </div>
        ) : (
          <Button onClick={enrol} disabled={busy || supported === false} className="w-full" size="lg">
            {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
            Set up fingerprint sign-in
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default FingerprintEnrollment;
