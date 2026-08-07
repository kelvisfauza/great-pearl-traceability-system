import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, Loader2 } from 'lucide-react';

const REGION_ID = 'quality-form-qr-reader';

/** Extracts a quality form code (e.g. GAC-QA-0001) from a scanned payload or URL. */
export function parseQualityFormCode(text: string): string | null {
  const value = (text || '').trim();
  if (!value) return null;
  const path = value.match(/\/(?:verify|verification)\/([^/?#\s]+)/i);
  const raw = path ? decodeURIComponent(path[1]) : value;
  const token = raw.trim().replace(/\s+/g, '-').toUpperCase();
  if (!token) return null;
  return token;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCode: (code: string) => void;
  busy?: boolean;
}

const QualityFormScanDialog = ({ open, onOpenChange, onCode, busy }: Props) => {
  const scannerRef = useRef<any>(null);
  const [manual, setManual] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    if (!open) { setCameraOn(false); setManual(''); setError(null); }
  }, [open]);

  useEffect(() => {
    if (!open || !cameraOn) return;
    let cancelled = false;
    (async () => {
      setStarting(true); setError(null);
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode(REGION_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        } as any);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: (vw: number, vh: number) => {
            const size = Math.floor(Math.min(vw, vh) * 0.8);
            return { width: size, height: size };
          } } as any,
          (decoded: string) => {
            const code = parseQualityFormCode(decoded);
            if (!code) { setError(`Unrecognised code: ${decoded.slice(0, 40)}`); return; }
            scanner.stop().catch(() => {});
            onCode(code);
          },
          () => {},
        );
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to access the camera. Type the code instead.');
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [open, cameraOn]);

  const submitManual = () => {
    const code = parseQualityFormCode(manual);
    if (!code) { setError('Enter the code printed under the QR (e.g. GAC-QA-0001)'); return; }
    onCode(code);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Scan the analysis form</DialogTitle>
          <DialogDescription>
            Scan the QR printed on the stamped analysis sheet, or type the code below it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {cameraOn ? (
            <div className="space-y-2">
              <div id={REGION_ID} className="w-full overflow-hidden rounded-md border bg-muted" />
              {starting && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Starting the camera…
                </p>
              )}
            </div>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => setCameraOn(true)}>
              <Camera className="h-4 w-4" /> Use this device's camera
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="qa-code">Form code</Label>
            <div className="flex gap-2">
              <Input
                id="qa-code"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitManual()}
                placeholder="GAC-QA-0001"
              />
              <Button onClick={submitManual} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
              </Button>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QualityFormScanDialog;
