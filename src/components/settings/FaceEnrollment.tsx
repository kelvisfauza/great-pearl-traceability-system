import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScanFace, CheckCircle2, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FaceCapture } from '@/components/auth/FaceCapture';

interface FaceCredentialRow {
  id: string;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
}

/**
 * Lets the logged-in user enrol or replace their face descriptor.
 * Once enrolled, this becomes a verification option on the sign-in screen
 * (replacing the email OTP step when chosen).
 */
const FaceEnrollment: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<FaceCredentialRow | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('face_credentials' as any)
      .select('id, device_label, created_at, last_used_at')
      .eq('user_id', user.id)
      .maybeSingle();
    setExisting((data as any) || null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCapture = async (descriptor: number[]) => {
    if (!user?.id || !user?.email) {
      toast({ title: 'Not signed in', description: 'Please sign in again.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const deviceLabel =
        typeof navigator !== 'undefined'
          ? navigator.userAgent.split(') ')[0].split('(').pop()?.slice(0, 60) || 'This device'
          : 'This device';

      const payload = {
        user_id: user.id,
        email: user.email,
        descriptor: descriptor as any,
        device_label: deviceLabel,
      };

      const { error } = await supabase
        .from('face_credentials' as any)
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Face ID enrolled',
        description: 'You can now sign in by scanning your face.',
      });
      setCapturing(false);
      await refresh();
    } catch (err: any) {
      console.error('Face enrolment failed:', err);
      toast({
        title: 'Enrolment failed',
        description: err?.message || 'Could not save your face. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!user?.id) return;
    if (!confirm('Remove your registered face? You will need to re-enrol to sign in with Face ID.')) {
      return;
    }
    const { error } = await supabase
      .from('face_credentials' as any)
      .delete()
      .eq('user_id', user.id);
    if (error) {
      toast({ title: 'Removal failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Face ID removed', description: 'Your face credential has been deleted.' });
    await refresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <ScanFace className="h-5 w-5 text-primary" />
              Face ID Sign-in
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Register your face once on this device and sign in by simply looking at the camera —
              no email codes or date of birth needed.
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
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : capturing ? (
          <>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your face is processed on this device and stored as a secure mathematical signature —
                no photos are saved.
              </AlertDescription>
            </Alert>
            <FaceCapture
              onCapture={handleCapture}
              actionLabel={existing ? 'Replace registered face' : 'Register my face'}
              busy={saving}
            />
            <Button variant="ghost" className="w-full" onClick={() => setCapturing(false)} disabled={saving}>
              Cancel
            </Button>
          </>
        ) : existing ? (
          <>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs md:text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Device</span><span className="font-medium truncate ml-2">{existing.device_label || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Enrolled</span><span>{new Date(existing.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last used</span><span>{existing.last_used_at ? new Date(existing.last_used_at).toLocaleString() : 'Never'}</span></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setCapturing(true)} className="flex-1">
                <ScanFace className="mr-2 h-4 w-4" /> Re-register face
              </Button>
              <Button onClick={handleRemove} variant="outline" className="flex-1 text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your face is processed on this device and stored as a secure mathematical signature —
                no photos are saved.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setCapturing(true)} className="w-full" size="lg">
              <ScanFace className="mr-2 h-5 w-5" /> Set up Face ID
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceEnrollment;