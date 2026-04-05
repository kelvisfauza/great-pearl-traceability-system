import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Camera, Check, ScanLine, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Step = 'loading' | 'invalid' | 'expired' | 'ready' | 'scanning' | 'photo' | 'uploading' | 'done';

const ScanWeighBridge = () => {
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get('session');
  const [step, setStep] = useState<Step>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQrData, setCurrentQrData] = useState('');
  const [ticketCount, setTicketCount] = useState(0);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);

  // Validate session on mount
  useEffect(() => {
    if (!sessionCode) {
      setStep('invalid');
      return;
    }
    const validate = async () => {
      const { data, error } = await supabase
        .from('weighbridge_scan_sessions' as any)
        .select('id, status, expires_at')
        .eq('session_code', sessionCode)
        .maybeSingle();

      if (error || !data) {
        setStep('invalid');
        return;
      }
      const d = data as any;
      if (d.status !== 'active' || new Date(d.expires_at) < new Date()) {
        setStep('expired');
        return;
      }
      setSessionId(d.id);

      // Get existing ticket count
      const { count } = await supabase
        .from('weighbridge_scanned_tickets' as any)
        .select('id', { count: 'exact', head: true })
        .eq('session_id', d.id);
      setTicketCount(count || 0);
      setStep('ready');
    };
    validate();
  }, [sessionCode]);

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      try { scannerRef.current.stop().catch(() => {}); } catch {}
      scannerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startQrScanner = async () => {
    setStep('scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await new Promise(r => setTimeout(r, 300));

      const scanner = new Html5Qrcode('mobile-qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setCurrentQrData(decodedText);
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setStep('photo');
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError('Could not access camera. Please allow camera permission and try again.');
      setStep('ready');
    }
  };

  useEffect(() => {
    if (step === 'photo') {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
      }).then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }).catch(() => setError('Camera access denied'));
    }
    return () => { if (step === 'photo') stopCamera(); };
  }, [step, stopCamera]);

  const captureAndSave = async () => {
    if (!videoRef.current || !canvasRef.current || !sessionId) return;
    setStep('uploading');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    stopCamera();

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(), 'image/jpeg', 0.85);
      });

      const fileName = `weighbridge/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('dispatch-attachments')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('dispatch-attachments')
        .getPublicUrl(fileName);

      const { error: insertErr } = await supabase
        .from('weighbridge_scanned_tickets' as any)
        .insert({
          session_id: sessionId,
          qr_data: currentQrData,
          photo_url: urlData.publicUrl,
        });
      if (insertErr) throw insertErr;

      setTicketCount(c => c + 1);
      setCurrentQrData('');
      setStep('done');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save ticket. Try again.');
      setStep('ready');
    }
  };

  const skipPhoto = async () => {
    if (!sessionId) return;
    setStep('uploading');
    stopCamera();
    try {
      const { error: insertErr } = await supabase
        .from('weighbridge_scanned_tickets' as any)
        .insert({
          session_id: sessionId,
          qr_data: currentQrData,
          photo_url: null,
        });
      if (insertErr) throw insertErr;

      setTicketCount(c => c + 1);
      setCurrentQrData('');
      setStep('done');
    } catch {
      setError('Failed to save ticket');
      setStep('ready');
    }
  };

  // Full-screen mobile layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5" />
          <h1 className="text-lg font-bold">Weigh Bridge Scanner</h1>
        </div>
        <p className="text-sm opacity-80 mt-1">Great Agro Coffee</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating session...</p>
          </div>
        )}

        {/* Invalid / Expired */}
        {(step === 'invalid' || step === 'expired') && (
          <Card>
            <CardContent className="py-12 text-center">
              <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">
                {step === 'invalid' ? 'Invalid Scan Link' : 'Session Expired'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {step === 'invalid'
                  ? 'This QR code is not valid. Please scan a new one from the dispatch form.'
                  : 'This scanning session has expired. Please generate a new QR code from the dispatch form.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            {error}
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError('')}>Dismiss</Button>
          </div>
        )}

        {/* Ticket count */}
        {(step === 'ready' || step === 'done') && (
          <div className="text-center">
            <Badge variant="secondary" className="text-base px-4 py-2">
              {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} scanned
            </Badge>
          </div>
        )}

        {/* Ready / Done - scan button */}
        {(step === 'ready' || step === 'done') && (
          <Button onClick={startQrScanner} className="w-full h-20 text-lg" size="lg">
            <QrCode className="h-7 w-7 mr-3" />
            {ticketCount === 0 ? 'Scan First Ticket' : 'Scan Next Ticket'}
          </Button>
        )}

        {/* QR Scanning */}
        {step === 'scanning' && (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-black aspect-square">
              <div id="mobile-qr-reader" className="w-full h-full" />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="h-4 w-4 animate-pulse" />
              Point at the QR code on the weigh bridge ticket...
            </div>
            <Button variant="outline" className="w-full" onClick={() => { stopCamera(); setStep('ready'); }}>
              Cancel
            </Button>
          </div>
        )}

        {/* Photo capture */}
        {step === 'photo' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center text-sm">
              <Check className="h-4 w-4 inline mr-1 text-primary" />
              QR scanned! Now take a photo of the ticket.
            </div>
            <div className="rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2">
              <Button onClick={captureAndSave} className="flex-1 h-14 text-base">
                <Camera className="h-5 w-5 mr-2" /> Capture Photo
              </Button>
              <Button variant="outline" onClick={skipPhoto} className="h-14">
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Uploading */}
        {step === 'uploading' && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Saving ticket...</p>
          </div>
        )}

        {/* Done message */}
        {step === 'done' && (
          <Card>
            <CardContent className="py-6 text-center">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Check className="h-5 w-5" />
                <span className="font-semibold">Ticket saved!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                It will appear on the dispatch form on your computer automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-muted-foreground border-t">
        Session: {sessionCode?.slice(0, 6)}... • {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} scanned
      </div>
    </div>
  );
};

export default ScanWeighBridge;
