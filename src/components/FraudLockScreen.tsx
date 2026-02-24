import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, Lock, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FraudLockScreenProps {
  lockId: string;
  userName: string;
  onUnlocked: () => void;
}

const FraudLockScreen = ({ lockId, userName, onUnlocked }: FraudLockScreenProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAppeal = async () => {
    if (!code.trim()) {
      setError('Please enter the unlock code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify the code against the lock record
      const { data, error: fetchError } = await supabase
        .from('user_fraud_locks')
        .select('*')
        .eq('id', lockId)
        .eq('unlock_code', code.trim())
        .eq('is_locked', true)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Invalid unlock code. Please contact an administrator.');
        setLoading(false);
        return;
      }

      // Unlock the user
      await supabase
        .from('user_fraud_locks')
        .update({
          is_locked: false,
          unlocked_at: new Date().toISOString(),
          unlocked_by: 'admin_code'
        })
        .eq('id', lockId);

      setSuccess(true);
      setTimeout(() => onUnlocked(), 1500);
    } catch (err) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-destructive/95 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-destructive/10 rounded-full w-fit">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">
            Account Temporarily Locked
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Dear {userName}, your account has been temporarily locked due to suspected
              non-productive activity aimed at earning loyalty rewards. 
              Rapid page browsing without meaningful work has been detected.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">To unlock your account:</p>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                An unlock code has been sent to the administrators via SMS. 
                Please contact an admin to get the code and enter it below.
              </span>
            </div>
          </div>

          {success ? (
            <Alert className="border-primary bg-primary/10">
              <AlertDescription className="text-primary">
                Account unlocked successfully! Redirecting...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Input
                  placeholder="Enter 6-digit unlock code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleAppeal}
                disabled={loading || !code.trim()}
                className="w-full"
                variant="default"
              >
                {loading ? 'Verifying...' : 'Submit Appeal Code'}
              </Button>
            </>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Contact IT Support: +256773318456 if you need assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudLockScreen;
