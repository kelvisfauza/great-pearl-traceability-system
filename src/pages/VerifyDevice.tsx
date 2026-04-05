import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VerifyDevice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const verifyToken = async () => {
      try {
        // Find device session with this token
        const { data: device, error } = await supabase
          .from('device_sessions')
          .select('id, token_expires_at, token_used_at, is_trusted')
          .eq('verification_token', token)
          .maybeSingle();

        if (error || !device) {
          setStatus('error');
          return;
        }

        if (device.is_trusted || device.token_used_at) {
          setStatus('success'); // Already verified
          return;
        }

        if (new Date(device.token_expires_at) < new Date()) {
          setStatus('expired');
          return;
        }

        // Mark device as trusted
        const { error: updateError } = await supabase
          .from('device_sessions')
          .update({
            is_trusted: true,
            token_used_at: new Date().toISOString(),
          })
          .eq('id', device.id);

        if (updateError) {
          console.error('Failed to verify device:', updateError);
          setStatus('error');
          return;
        }

        setStatus('success');
      } catch (err) {
        console.error('Device verification error:', err);
        setStatus('error');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
            <h1 className="text-xl font-bold text-foreground mb-2">Verifying Device...</h1>
            <p className="text-muted-foreground text-sm">Please wait while we verify your device.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Device Verified! ✅</h1>
            <p className="text-muted-foreground text-sm mb-6">
              This device is now trusted. You can log in without verification next time.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <Shield className="h-10 w-10 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Link Expired ⏰</h1>
            <p className="text-muted-foreground text-sm mb-6">
              This verification link has expired (30 minutes). Please log in again to receive a new link.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Verification Failed ❌</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Invalid or corrupted verification link. Please try logging in again.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyDevice;
