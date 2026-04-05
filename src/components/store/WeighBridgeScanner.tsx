import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QrCode, Camera, Trash2, Check, X, ScanLine, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface WeighBridgeTicket {
  id: string;
  qr_data: string;
  photo_url: string | null;
  scanned_at: string;
}

interface WeighBridgeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: WeighBridgeTicket[];
  onTicketsChange: (tickets: WeighBridgeTicket[]) => void;
}

type ScanStep = 'idle' | 'scanning' | 'photo' | 'done';

const WeighBridgeScanner: React.FC<WeighBridgeScannerProps> = ({
  open,
  onOpenChange,
  tickets,
  onTicketsChange,
}) => {
  const [step, setStep] = useState<ScanStep>('idle');
  const [currentQrData, setCurrentQrData] = useState('');
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
      } catch {}
      scannerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStep('idle');
      setCurrentQrData('');
    }
  }, [open, stopCamera]);

  const startQrScanner = async () => {
    setStep('scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Wait for DOM element to render
      await new Promise(r => setTimeout(r, 300));
      
      const el = document.getElementById('weighbridge-qr-reader');
      if (!el) {
        toast.error('Scanner element not found');
        setStep('idle');
        return;
      }

      const scanner = new Html5Qrcode('weighbridge-qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Check for duplicates
          if (tickets.some(t => t.qr_data === decodedText)) {
            toast.warning('This ticket has already been scanned');
            return;
          }
          setCurrentQrData(decodedText);
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setStep('photo');
          toast.success('QR Code scanned! Now take a photo of the ticket.');
        },
        () => {} // ignore scan failures
      );
    } catch (err: any) {
      console.error('QR scanner error:', err);
      toast.error('Could not access camera. Please allow camera permission.');
      setStep('idle');
    }
  };

  const startPhotoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Could not access camera for photo');
    }
  };

  useEffect(() => {
    if (step === 'photo') {
      startPhotoCapture();
    }
    return () => {
      if (step === 'photo') {
        stopCamera();
      }
    };
  }, [step]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setUploading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    stopCamera();

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to capture')), 'image/jpeg', 0.85);
      });

      const fileName = `weighbridge/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('dispatch-attachments')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('dispatch-attachments')
        .getPublicUrl(fileName);

      const newTicket: WeighBridgeTicket = {
        id: crypto.randomUUID(),
        qr_data: currentQrData,
        photo_url: urlData.publicUrl,
        scanned_at: new Date().toISOString(),
      };

      onTicketsChange([...tickets, newTicket]);
      toast.success('Weigh bridge ticket saved!');
      setCurrentQrData('');
      setStep('done');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const skipPhoto = () => {
    const newTicket: WeighBridgeTicket = {
      id: crypto.randomUUID(),
      qr_data: currentQrData,
      photo_url: null,
      scanned_at: new Date().toISOString(),
    };
    onTicketsChange([...tickets, newTicket]);
    stopCamera();
    toast.success('Ticket scanned (no photo)');
    setCurrentQrData('');
    setStep('done');
  };

  const removeTicket = (id: string) => {
    onTicketsChange(tickets.filter(t => t.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan Weigh Bridge Tickets
          </DialogTitle>
          <DialogDescription>
            Scan the QR code on each weigh bridge ticket, then take a photo of it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner Area */}
          {step === 'scanning' && (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-square max-h-[300px]">
                <div id="weighbridge-qr-reader" ref={qrReaderRef} className="w-full h-full" />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <ScanLine className="h-4 w-4 animate-pulse" />
                Point camera at the QR code on the ticket...
              </div>
              <Button variant="outline" className="w-full" onClick={() => { stopCamera(); setStep('idle'); }}>
                <X className="h-4 w-4 mr-2" /> Cancel Scan
              </Button>
            </div>
          )}

          {/* Photo Capture */}
          {step === 'photo' && (
            <div className="space-y-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center text-sm">
                <p className="font-medium">QR Data: <span className="font-mono">{currentQrData.slice(0, 50)}{currentQrData.length > 50 ? '...' : ''}</span></p>
              </div>
              <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <Button onClick={capturePhoto} disabled={uploading} className="flex-1">
                  {uploading ? 'Uploading...' : (<><Camera className="h-4 w-4 mr-2" /> Capture Photo</>)}
                </Button>
                <Button variant="outline" onClick={skipPhoto}>
                  Skip Photo
                </Button>
              </div>
            </div>
          )}

          {/* Idle / Done - show action buttons */}
          {(step === 'idle' || step === 'done') && (
            <Button onClick={startQrScanner} className="w-full" size="lg">
              <QrCode className="h-5 w-5 mr-2" />
              {tickets.length === 0 ? 'Scan First Ticket' : 'Scan Another Ticket'}
            </Button>
          )}

          {/* Scanned Tickets List */}
          {tickets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Scanned Tickets ({tickets.length})</p>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {tickets.map((ticket, index) => (
                    <Card key={ticket.id} className="border-dashed">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Badge variant="secondary" className="shrink-0">#{index + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate">{ticket.qr_data}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {ticket.photo_url ? (
                              <Badge variant="outline" className="text-xs">
                                <ImagePlus className="h-3 w-3 mr-1" /> Photo attached
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">No photo</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(ticket.scanned_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeTicket(ticket.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Done button */}
          {tickets.length > 0 && (step === 'idle' || step === 'done') && (
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              <Check className="h-4 w-4 mr-2" /> Done ({tickets.length} ticket{tickets.length !== 1 ? 's' : ''} scanned)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeighBridgeScanner;
