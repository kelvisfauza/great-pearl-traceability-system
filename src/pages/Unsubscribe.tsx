import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, MailX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error'>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
        { headers: { apikey: anonKey } }
      );
      const data = await response.json();

      if (data.valid === false && data.reason === 'already_unsubscribed') {
        setStatus('already');
      } else if (data.valid) {
        setStatus('valid');
      } else {
        setStatus('invalid');
      }
    } catch {
      setStatus('invalid');
    }
  };

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token }
      });
      if (error) throw error;
      if (data?.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[#0d3d1f] rounded-xl">
              <img
                src="/lovable-uploads/great-agro-coffee-logo.png"
                alt="Great Agro Coffee"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
          <CardTitle>Email Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {status === 'valid' && (
            <>
              <Alert>
                <MailX className="h-4 w-4" />
                <AlertDescription>
                  Click below to unsubscribe from Great Agro Coffee app emails.
                </AlertDescription>
              </Alert>
              <Button onClick={handleUnsubscribe} disabled={processing} className="w-full" variant="destructive">
                {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Confirm Unsubscribe'}
              </Button>
            </>
          )}

          {status === 'success' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>You have been successfully unsubscribed.</AlertDescription>
            </Alert>
          )}

          {status === 'already' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>You are already unsubscribed from these emails.</AlertDescription>
            </Alert>
          )}

          {status === 'invalid' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>This unsubscribe link is invalid or has expired.</AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>Something went wrong. Please try again later.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
