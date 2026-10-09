import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Status = 'ask' | 'loading' | 'approved' | 'rejected' | 'expired' | 'error';

const VerifyDevice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'ask' : 'error');

  const decide = async (approve: boolean) => {
    if (!token) return;
    setStatus('loading');
    try {
      const { data, error } = await supabase.rpc(
        (approve ? 'verify_device_token' : 'reject_device_token') as any,
        { p_token: token } as any,
      );
      if (error) throw error;
      const s = (data as { status?: string } | null)?.status;
      if (s === 'success') setStatus('approved');
      else if (s === 'rejected') setStatus('rejected');
      else if (s === 'expired') setStatus('expired');
      else setStatus('error');
    } catch (err) {
      console.error('Device decision error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border p-8 text-center">
        {status === 'ask' && (
          <>
            <Shield className="h-14 w-14 mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-bold text-foreground mb-2">New device sign-in</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Someone signed into your Great Agro Coffee account on a new device. Was this you?
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" onClick={() => decide(false)}>
                Reject
              </Button>
              <Button className="flex-1" onClick={() => decide(true)}>
                Approve
              </Button>
            </div>
          </>
        )}

        {status === 'loading' && (
          <>
            <Loader2 className="h-14 w-14 mx-auto mb-4 text-primary animate-spin" />
            <h1 className="text-xl font-bold text-foreground">Saving your choice…</h1>
          </>
        )}

        {status === 'approved' && (
          <>
            <CheckCircle className="h-14 w-14 mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-bold text-foreground mb-2">Device approved</h1>
            <p className="text-muted-foreground text-sm mb-6">This device is now trusted.</p>
            <Button onClick={() => navigate('/auth')} className="w-full">Go to Login</Button>
          </>
        )}

        {status === 'rejected' && (
          <>
            <XCircle className="h-14 w-14 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-bold text-foreground mb-2">Device rejected</h1>
            <p className="text-muted-foreground text-sm mb-6">
              That device can no longer sign in. Change your password now and tell IT support.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">Go to Login</Button>
          </>
        )}

        {(status === 'expired' || status === 'error') && (
          <>
            <XCircle className="h-14 w-14 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-bold text-foreground mb-2">
              {status === 'expired' ? 'Link expired' : 'Invalid link'}
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              {status === 'expired'
                ? 'This link has expired (30 minutes). Sign in again to get a new one.'
                : 'This link is not valid. Sign in again to get a new one.'}
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">Go to Login</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyDevice;
