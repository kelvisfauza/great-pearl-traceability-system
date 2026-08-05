import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, Smartphone, Camera, CheckCircle2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { buildPublicUrl } from "@/utils/publicUrl";
import {
  addToQueue,
  getQueue,
  getScanSessionId,
  removeFromQueue,
  subscribeQueue,
  getPairedDevice,
  setPairedDevice,
  unpairDevice,
  subscribePairing,
} from "@/utils/grnQueue";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REGION_ID = "grn-qr-reader";

/**
 * Extracts a GRN reference from a scanned QR payload.
 * Tolerates every format we have ever printed:
 *  - new scan-to-pay URLs:      https://.../grn/GRN-20260729009
 *  - legacy verification URLs:  https://.../verify/20260729009  |  ?grn=...  |  ?batch=...
 *  - raw references:            GRN-20260729009
 *  - bare batch numbers:        20260729009
 */
export function parseGrnReference(text: string): string | null {
  const value = (text || "").trim();
  if (!value) return null;

  // Path-based: /grn/<ref>, /verify/<ref>, /grn-verify/<ref>
  const path = value.match(/\/(?:grn|verify|grn-verify|verification)\/([^/?#\s]+)/i);
  if (path) return normalizeRef(decodeURIComponent(path[1]));

  // Query-string based: ?grn=... | ?batch=... | ?ref=... | ?code=...
  const query = value.match(/[?&](?:grn|batch|batch_number|ref|reference|code)=([^&#\s]+)/i);
  if (query) return normalizeRef(decodeURIComponent(query[1]));

  // Raw reference or bare batch number
  if (/^GRN[-_]?[\w-]+$/i.test(value)) return normalizeRef(value);
  if (/^\d{6,16}$/.test(value)) return normalizeRef(value);

  // Last resort: a GRN-looking token anywhere in the payload
  const loose = value.match(/GRN[-_]?\d{6,16}/i) || value.match(/\b\d{8,14}\b/);
  if (loose) return normalizeRef(loose[0]);

  return null;
}

function normalizeRef(raw: string): string | null {
  const ref = (raw || "").trim().replace(/\s+/g, "");
  if (!ref) return null;
  return /^\d+$/.test(ref) ? ref : ref.toUpperCase();
}

const GRNScannerDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const scannerRef = useRef<any>(null);
  const [starting, setStarting] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"phone" | "camera">("phone");
  const [sessionId, setSessionId] = useState(() => getScanSessionId());
  const [paired, setPaired] = useState(false);
  const [device, setDevice] = useState(() => getPairedDevice());
  const [showQr, setShowQr] = useState(false);
  const [queue, setQueue] = useState(() => getQueue());
  const pairUrl = buildPublicUrl(`/scan/${sessionId}`);

  useEffect(() => subscribeQueue(() => setQueue(getQueue())), []);
  useEffect(() => subscribePairing(() => setDevice(getPairedDevice())), []);
  useEffect(() => {
    if (open) {
      setDevice(getPairedDevice());
      setShowQr(false);
    }
  }, [open]);

  const queueOnly = (reference: string) => {
    const added = addToQueue(reference);
    toast[added ? "success" : "info"](added ? `${reference} added to the pay queue` : `${reference} is already queued`);
  };

  const go = (reference: string) => {
    addToQueue(reference);
    onOpenChange(false);
    navigate(`/grn/${encodeURIComponent(reference)}`);
  };

  // Listen for scans pushed from the paired phone
  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`grn-scan-${sessionId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "grn" }, ({ payload }: any) => {
        const ref = payload?.reference;
        if (ref) {
          setPaired(true);
          setPairedDevice(payload?.device || "Phone");
          const first = getQueue().filter((i) => !i.paid).length === 0;
          if (first) {
            toast.success(`Received ${ref} from your phone`);
            go(ref);
          } else {
            queueOnly(ref);
          }
        }
      })
      .on("broadcast", { event: "hello" }, ({ payload }: any) => {
        setPaired(true);
        setPairedDevice(payload?.device || "Phone");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, sessionId]);

  useEffect(() => {
    if (!open || mode !== "camera") return;
    let cancelled = false;

    (async () => {
      setStarting(true);
      setError(null);
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(REGION_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        } as any);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (vw: number, vh: number) => {
              const size = Math.floor(Math.min(vw, vh) * 0.8);
              return { width: size, height: size };
            },
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          } as any,
          (decoded: string) => {
            const ref = parseGrnReference(decoded);
            if (!ref) {
              toast.error(`Unrecognised code: ${decoded.slice(0, 40)}`);
              return;
            }
            if (getQueue().filter((i) => !i.paid).length === 0) {
              scanner.stop().catch(() => {});
              go(ref);
            } else {
              queueOnly(ref);
            }
          },
          () => {}
        );
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Unable to access camera. Use manual entry below.");
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [open, mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Scan GRN</DialogTitle>
          <DialogDescription>
            Point your phone camera at the QR code on the printed GRN. The system opens the GRN for payment automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="phone" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Use my phone</TabsTrigger>
              <TabsTrigger value="camera" className="gap-1.5"><Camera className="h-3.5 w-3.5" /> This device</TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="pt-3">
              {device && !showQr ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-full rounded-lg border border-green-600/30 bg-green-600/5 p-4 flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                    <p className="text-sm font-medium">Connected to {device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Paired {new Date(device.pairedAt).toLocaleString()} · no need to scan this code again.
                      Just scan GRNs on the phone and they open here.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowQr(true)}>
                      <QrCode className="h-3.5 w-3.5 mr-1.5" /> Show pairing code
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        unpairDevice();
                        setSessionId(getScanSessionId());
                        setDevice(null);
                        setPaired(false);
                        setShowQr(true);
                        toast.info("Phone disconnected — scan the new code to pair again");
                      }}
                    >
                      <Unplug className="h-3.5 w-3.5 mr-1.5" /> Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="bg-white p-3 rounded-md border">
                  <QRCodeSVG value={pairUrl} size={168} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan this with your phone camera to turn it into a GRN scanner. Every GRN you scan on the
                  phone opens right here automatically — keep scanning and the rest queue up for payment.
                </p>
                <p className="text-[11px] text-muted-foreground break-all">{pairUrl}</p>
                <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${paired ? "bg-green-600" : "bg-amber-500 animate-pulse"}`} />
                  {paired ? "Phone connected" : "Waiting for your phone…"}
                </p>
              </div>
              )}
            </TabsContent>

            <TabsContent value="camera" className="pt-3 space-y-2">
              <div id={REGION_ID} className="w-full overflow-hidden rounded-md bg-muted min-h-[220px]" />
              {starting && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </TabsContent>
          </Tabs>

          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">Or enter the GRN number manually — digits only</p>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <span className="pl-3 pr-1 text-sm text-muted-foreground select-none">GRN-</span>
                <Input
                  value={manual}
                  inputMode="numeric"
                  onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
                  placeholder="20260802001"
                  className="border-0 shadow-none focus-visible:ring-0 px-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const ref = manual.trim();
                      if (ref) go(ref);
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  const ref = manual.trim();
                  if (!ref) return toast.error("Enter the GRN digits");
                  go(ref);
                }}
              >
                Open
              </Button>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="pt-2 border-t space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Pay queue ({queue.filter((q) => !q.paid).length} pending)</p>
              </div>
              <div className="max-h-32 overflow-auto space-y-1">
                {queue.map((q) => (
                  <div key={q.ref} className="flex items-center justify-between gap-2 text-xs rounded border px-2 py-1">
                    <button className="truncate text-left hover:underline" onClick={() => go(q.ref)}>
                      {q.ref}{q.paid ? " · paid" : ""}
                    </button>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => removeFromQueue(q.ref)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNScannerDialog;
