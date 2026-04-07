import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Check, Loader2, ScanLine, Eye, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Step = 'loading' | 'invalid' | 'expired' | 'ready' | 'scanning' | 'preview' | 'uploading' | 'done';

const ScanWeighBridge = () => {
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get('session');
  const [step, setStep] = useState<Step>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(0);
  const [error, setError] = useState('');
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const stableFramesRef = useRef(0);
  const lastDetectionRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

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
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setAutoDetecting(false);
  }, []);

  /**
   * Detect a white rectangular ticket (thermal receipt) in the video frame.
   * Looks for a large bright rectangular region against a darker background.
   */
  const detectTicket = useCallback(() => {
    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Use smaller resolution for detection speed
    const scale = 0.25;
    const w = Math.floor(video.videoWidth * scale);
    const h = Math.floor(video.videoHeight * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Convert to grayscale and threshold to find white regions
    const binary = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const gray = (r + g + b) / 3;
      // Thermal receipts are very white/bright
      binary[i] = gray > 170 ? 1 : 0;
    }

    // Find bounding box of the largest white region
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let whiteCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (binary[y * w + x] === 1) {
          whiteCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const boxArea = boxW * boxH;
    const frameArea = w * h;
    const coverage = boxArea / frameArea;
    const density = whiteCount / boxArea;
    const aspect = boxH > 0 ? boxW / boxH : 0;

    // Ticket detection criteria:
    // - White region covers 15-85% of the frame
    // - The white density within bounding box is > 50% (it's a filled rectangle)
    // - Aspect ratio suggests a receipt (taller than wide, or roughly square)
    const isTicket = coverage > 0.12 && coverage < 0.85 &&
                     density > 0.45 &&
                     aspect > 0.2 && aspect < 2.5 &&
                     boxW > w * 0.2 && boxH > h * 0.2;

    if (isTicket) {
      return {
        x: Math.floor(minX / scale),
        y: Math.floor(minY / scale),
        w: Math.floor(boxW / scale),
        h: Math.floor(boxH / scale)
      };
    }
    return null;
  }, []);

  const autoCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedImageUrl(url);
        stopCamera();
        setStep('preview');
      }
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  const startScanning = async () => {
    setStep('scanning');
    setAutoDetecting(true);
    setDetectionStatus('Position the ticket in view...');
    stableFramesRef.current = 0;
    lastDetectionRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1440 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start detection loop
      detectionIntervalRef.current = window.setInterval(() => {
        const detection = detectTicket();

        if (detection) {
          const last = lastDetectionRef.current;
          // Check if detection is stable (similar position across frames)
          if (last) {
            const dx = Math.abs(detection.x - last.x);
            const dy = Math.abs(detection.y - last.y);
            const dw = Math.abs(detection.w - last.w);
            const dh = Math.abs(detection.h - last.h);
            const stable = dx < 30 && dy < 30 && dw < 40 && dh < 40;

            if (stable) {
              stableFramesRef.current++;
              setDetectionStatus(`Ticket detected! Hold steady... (${Math.min(stableFramesRef.current, 8)}/8)`);

              // Auto-capture after 8 stable frames (~1.6 seconds at 5fps)
              if (stableFramesRef.current >= 8) {
                setDetectionStatus('📸 Auto-capturing...');
                autoCapture();
                return;
              }
            } else {
              stableFramesRef.current = Math.max(0, stableFramesRef.current - 2);
              setDetectionStatus('Ticket detected — hold still...');
            }
          } else {
            setDetectionStatus('Ticket detected — hold still...');
          }
          lastDetectionRef.current = detection;
        } else {
          stableFramesRef.current = 0;
          lastDetectionRef.current = null;
          setDetectionStatus('Position the weighbridge ticket in view...');
        }
      }, 200); // 5fps detection
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please allow camera permission.');
      setStep('ready');
    }
  };

  const manualCapture = () => {
    autoCapture();
  };

  const retake = () => {
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl);
      setCapturedImageUrl(null);
    }
    startScanning();
  };

  const uploadTicket = async () => {
    if (!capturedImageUrl || !sessionId) return;
    setStep('uploading');

    try {
      // Convert object URL back to blob
      const response = await fetch(capturedImageUrl);
      const blob = await response.blob();

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
          qr_data: `auto-captured-${Date.now()}`,
          photo_url: urlData.publicUrl,
        });
      if (insertErr) throw insertErr;

      setTicketCount(c => c + 1);
      URL.revokeObjectURL(capturedImageUrl);
      setCapturedImageUrl(null);
      setStep('done');
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload ticket. Try again.');
      setStep('preview');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Camera className="h-5 w-5" />
          <h1 className="text-lg font-bold">Weigh Bridge Scanner</h1>
        </div>
        <p className="text-sm opacity-80 mt-1">Great Pearl Coffee</p>
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
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">
                {step === 'invalid' ? 'Invalid Scan Link' : 'Session Expired'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {step === 'invalid'
                  ? 'This link is not valid. Please scan a new QR code from the dispatch form.'
                  : 'This session has expired. Please generate a new QR code from the dispatch form.'}
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
              {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} captured
            </Badge>
          </div>
        )}

        {/* Ready / Done - scan button */}
        {(step === 'ready' || step === 'done') && (
          <div className="space-y-3">
            <Button onClick={startScanning} className="w-full h-20 text-lg" size="lg">
              <Camera className="h-7 w-7 mr-3" />
              {ticketCount === 0 ? 'Scan First Ticket' : 'Scan Next Ticket'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Point your camera at the weighbridge ticket — it will auto-detect and capture
            </p>
          </div>
        )}

        {/* Camera scanning with auto-detection */}
        {step === 'scanning' && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[3/4]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {/* Detection overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner guides */}
                <div className="absolute top-[10%] left-[10%] w-10 h-10 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                <div className="absolute top-[10%] right-[10%] w-10 h-10 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                <div className="absolute bottom-[10%] left-[10%] w-10 h-10 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                <div className="absolute bottom-[10%] right-[10%] w-10 h-10 border-b-3 border-r-3 border-primary rounded-br-lg" />
              </div>
              {/* Status bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3">
                <div className="flex items-center justify-center gap-2 text-white text-sm">
                  {stableFramesRef.current > 0 ? (
                    <Eye className="h-4 w-4 text-green-400 animate-pulse" />
                  ) : (
                    <ScanLine className="h-4 w-4 animate-pulse" />
                  )}
                  <span>{detectionStatus}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200 rounded-full"
                    style={{ width: `${Math.min((stableFramesRef.current / 8) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={manualCapture} variant="secondary" className="flex-1 h-14 text-base">
                <Camera className="h-5 w-5 mr-2" /> Manual Capture
              </Button>
              <Button variant="outline" className="h-14" onClick={() => { stopCamera(); setStep('ready'); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Preview captured image */}
        {step === 'preview' && capturedImageUrl && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4 inline mr-1" />
              Ticket captured! Review and upload.
            </div>
            <div className="rounded-lg overflow-hidden bg-black">
              <img
                src={capturedImageUrl}
                alt="Captured weighbridge ticket"
                className="w-full h-auto max-h-[50vh] object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={uploadTicket} className="flex-1 h-14 text-base">
                <Check className="h-5 w-5 mr-2" /> Upload Ticket
              </Button>
              <Button variant="outline" onClick={retake} className="h-14">
                <RotateCcw className="h-5 w-5 mr-2" /> Retake
              </Button>
            </div>
          </div>
        )}

        {/* Uploading */}
        {step === 'uploading' && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Uploading ticket...</p>
          </div>
        )}

        {/* Done message */}
        {step === 'done' && (
          <Card>
            <CardContent className="py-6 text-center">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Check className="h-5 w-5" />
                <span className="font-semibold">Ticket uploaded!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                It will appear on the dispatch form on your computer automatically.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Hidden canvases for processing */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={detectionCanvasRef} className="hidden" />
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-muted-foreground border-t">
        Session: {sessionCode?.slice(0, 6)}... • {ticketCount} ticket{ticketCount !== 1 ? 's' : ''} captured
      </div>
    </div>
  );
};

export default ScanWeighBridge;
