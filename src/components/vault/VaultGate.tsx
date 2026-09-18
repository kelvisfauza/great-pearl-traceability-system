import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVaultLock, markVaultUnlocked } from '@/hooks/useVaultLock';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Lock, KeyRound } from 'lucide-react';

type Status = { has_pin: boolean; locked_until: string | null } | null;
type Mode = 'loading' | 'setup' | 'unlock' | 'reset';

const Digits = ({ value, onChange, onComplete, disabled }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean;
}) => (
  <InputOTP maxLength={6} value={value} onChange={onChange} onComplete={onComplete} disabled={disabled} containerClassName="justify-center gap-2">
    <InputOTPGroup className="gap-2">
      {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
    </InputOTPGroup>
  </InputOTP>
);

/**
 * Wraps every money screen. Nothing inside renders until the user
 * enters their 6-digit vault PIN. Re-locks after 5 idle minutes.
 */
const VaultGate: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title = 'Money Vault' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { unlocked } = useVaultLock();
  const [status, setStatus] = useState<Status>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    const { data, error: rpcError } = await supabase.rpc('vault_pin_status' as never);
    if (rpcError) {
      setError('Could not check your vault. Please refresh.');
      setMode('unlock');
      return;
    }
    const s = data as unknown as { has_pin: boolean; locked_until: string | null };
    setStatus(s);
    setMode(s?.has_pin ? 'unlock' : 'setup');
  };

  useEffect(() => {
    if (user) loadStatus();
  }, [user]);

  const handleUnlock = async (code: string) => {
    if (code.length !== 6 || busy) return;
    setBusy(true); setError(null);
    const { data, error: rpcError } = await supabase.rpc('vault_verify_pin' as never, { p_pin: code } as never);
    setBusy(false);
    const res = data as unknown as { ok: boolean; message?: string };
    if (rpcError || !res?.ok) {
      setPin('');
      setError(res?.message || 'Could not check that PIN. Try again.');
      return;
    }
    markVaultUnlocked();
    setPin('');
  };

  const handleSetPin = async () => {
    if (pin.length !== 6 || confirmPin.length !== 6) return;
    if (pin !== confirmPin) { setError('The two PINs do not match.'); return; }
    setBusy(true); setError(null);
    const payload: Record<string, string> = { p_pin: pin };
    if (mode === 'reset') payload.p_reset_code = resetCode;
    const { data, error: rpcError } = await supabase.rpc('vault_set_pin' as never, payload as never);
    setBusy(false);
    const res = data as unknown as { ok: boolean; message?: string };
    if (rpcError || !res?.ok) {
      setError(res?.message || 'Could not save that PIN. Try again.');
      return;
    }
    toast({ title: 'Vault PIN saved', description: 'Keep it private — it protects your money.' });
    setPin(''); setConfirmPin(''); setResetCode('');
    markVaultUnlocked();
    await loadStatus();
  };

  const requestResetCode = async () => {
    setBusy(true); setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('vault-pin-reset', { body: {} });
    setBusy(false);
    const res = data as { ok: boolean; message?: string; smsSent?: number; emailSent?: number } | null;
    if (fnError || !res?.ok) {
      setError(res?.message || 'Could not send a reset code. Try again shortly.');
      return;
    }
    toast({
      title: 'Reset code sent',
      description: `Check your phone (${res.smsSent || 0} text) and email (${res.emailSent || 0}). It expires in 10 minutes.`,
    });
    setMode('reset');
    setPin(''); setConfirmPin('');
  };

  if (unlocked) return <>{children}</>;

  if (mode === 'loading') {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const lockedUntil = status?.locked_until ? new Date(status.locked_until) : null;
  const isLockedOut = !!lockedUntil && lockedUntil > new Date();

  return (
    <div className="flex justify-center py-10 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            {mode === 'setup' ? <ShieldCheck className="w-7 h-7 text-primary" /> : <Lock className="w-7 h-7 text-primary" />}
          </div>
          <CardTitle>
            {mode === 'setup' ? 'Create your vault PIN' : mode === 'reset' ? 'Set a new vault PIN' : title}
          </CardTitle>
          <CardDescription>
            {mode === 'setup'
              ? 'Choose a 6-digit PIN. You will need it every time you open your money vault.'
              : mode === 'reset'
                ? 'Enter the code we sent to your phone and email, then choose a new PIN.'
                : 'Enter your 6-digit PIN to open your wallet, loans, advances and savings.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {isLockedOut && mode === 'unlock' && (
            <Alert variant="destructive">
              <AlertDescription>
                Too many wrong tries. Try again after {lockedUntil!.toLocaleTimeString()}.
              </AlertDescription>
            </Alert>
          )}

          {mode === 'unlock' && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">Vault PIN</p>
                <Digits value={pin} onChange={setPin} onComplete={handleUnlock} disabled={busy || isLockedOut} />
              </div>
              <Button className="w-full" onClick={() => handleUnlock(pin)} disabled={busy || pin.length !== 6 || isLockedOut}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Open vault
              </Button>
              <Button variant="ghost" className="w-full text-sm" onClick={requestResetCode} disabled={busy}>
                <KeyRound className="h-4 w-4 mr-2" /> Forgot your PIN? Send me a code
              </Button>
            </>
          )}

          {(mode === 'setup' || mode === 'reset') && (
            <>
              {mode === 'reset' && (
                <div className="space-y-2">
                  <p className="text-sm text-center text-muted-foreground">Reset code from your phone / email</p>
                  <Digits value={resetCode} onChange={setResetCode} disabled={busy} />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">New 6-digit PIN</p>
                <Digits value={pin} onChange={setPin} disabled={busy} />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">Confirm PIN</p>
                <Digits value={confirmPin} onChange={setConfirmPin} disabled={busy} />
              </div>
              <Button
                className="w-full"
                onClick={handleSetPin}
                disabled={busy || pin.length !== 6 || confirmPin.length !== 6 || (mode === 'reset' && resetCode.length !== 6)}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Save PIN & open vault
              </Button>
              {mode === 'reset' && (
                <Button variant="ghost" className="w-full text-sm" onClick={() => { setMode('unlock'); setError(null); }} disabled={busy}>
                  Back to PIN entry
                </Button>
              )}
              <p className="text-xs text-center text-muted-foreground">
                Never share this PIN. It is not your sign-in password.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VaultGate;
