import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, Loader2, Smartphone, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { buildPublicUrl } from '@/utils/publicUrl';
import { toast } from 'sonner';

const REGION_ID = 'dispatch-form-qr-reader';

export interface DispatchMonitoringForm {
  id: string;
  form_number: string;
  dispatch_date: string | null;
  warehouse: string | null;
  coffee_type: string | null;
  destination_buyer: string | null;
  vehicle_registrations: string | null;
  total_weight_store: number | null;
  traceability_confirmed: boolean;
  quality_analysis_attached: boolean;
  trucks: any;
  buyer_weight: number | null;
  receipt_attached: boolean;
  weight_difference: number | null;
  remarks: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
}

/** Extracts a dispatch monitoring form code (e.g. GAC-DM-2608-0001) from a scanned payload or URL. */
export function parseDispatchFormCode(text: string): string | null {
  const value = (text || '').trim();
  if (!value) return null;
  const path = value.match(/\/(?:verify|verification|dispatch-form)\/([^/?#\s]+)/i);
  const raw = path ? decodeURIComponent(path[1]) : value;
  const token = raw.trim().replace(/\s+/g, '-').toUpperCase();
  return token || null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onForm: (form: DispatchMonitoringForm) => void;
}

const DispatchFormScanDialog = ({ open, onOpenChange, onForm }: Props) => {
  const scannerRef = useRef<any>(null);
  const [manual, setManual] = useState('');
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [pairedDevice, setPairedDevice] = useState<string | null>(null);
  const pairUrl = buildPublicUrl(`/scan-dispatch/${sessionId}`);

  useEffect(() => {
    if (!open) { setCameraOn(false); setManual(''); setError(null); }
  }, [open]);

  const loadCode = async (rawCode: string) => {
    const code = parseDispatchFormCode(rawCode);
    if (!code) { setError('Enter the form code printed under the QR (e.g. GAC-DM-2608-0001)'); return; }
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from('dispatch_monitoring_forms')
        .select('*')
        .eq('form_number', code)
        .maybeSingle();
      if (err) throw err;
      if (!data) { setError(`No dispatch monitoring form found for ${code}`); return; }
      toast.success(`Loaded dispatch form ${code}`);
      onForm(data as DispatchMonitoringForm);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Could not load the form');
    } finally {
      setBusy(false);
    }
  };

  // Codes pushed from the paired phone
  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`dispatch-scan-${sessionId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'hello' }, ({ payload }: any) => setPairedDevice(payload?.device || 'Phone'))
      .on('broadcast', { event: 'dispatch-form' }, ({ payload }: any) => {
        if (!payload?.code) return;
        setPairedDevice(payload?.device || 'Phone');
        loadCode(payload.code);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, sessionId]);

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
            scanner.stop().catch(() => {});
            loadCode(decoded);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Scan dispatch monitoring form</DialogTitle>
          <DialogDescription>
            Scan the QR printed on the filled dispatch monitoring form to load its details here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 text-center space-y-2">
            <p className="flex items-center justify-center gap-2 text-sm font-medium">
              <Smartphone className="h-4 w-4" /> Scan with your phone
            </p>
            <div className="flex justify-center">
              <div className="rounded bg-white p-2">
                <QRCodeSVG value={pairUrl} size={132} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Scan this with your phone camera to open the scanner there — scan the form QR and photograph the filled
              form; both land here automatically.
            </p>
            {pairedDevice && (
              <p className="flex items-center justify-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="h-3 w-3" /> {pairedDevice} connected
              </p>
            )}
          </div>

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
            <Label htmlFor="dm-code">Form code</Label>
            <div className="flex gap-2">
              <Input
                id="dm-code"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCode(manual)}
                placeholder="GAC-DM-2608-0001"
              />
              <Button onClick={() => loadCode(manual)} disabled={busy}>
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

export default DispatchFormScanDialog;
