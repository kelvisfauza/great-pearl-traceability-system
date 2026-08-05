import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, Smartphone, Camera } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { buildPublicUrl } from "@/utils/publicUrl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REGION_ID = "grn-qr-reader";

/** Extracts a GRN reference from a scanned QR payload (URL or raw reference). */
export function parseGrnReference(text: string): string | null {
  const value = (text || "").trim();
  if (!value) return null;
  const match = value.match(/\/grn\/([^/?#\s]+)/i);
  if (match) return decodeURIComponent(match[1]);
  if (/^GRN[-\w]+$/i.test(value)) return value.toUpperCase();
  return null;
}

const GRNScannerDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const scannerRef = useRef<any>(null);
  const [starting, setStarting] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"phone" | "camera">("phone");
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [paired, setPaired] = useState(false);
  const pairUrl = buildPublicUrl(`/scan/${sessionId}`);

  const go = (reference: string) => {
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
          toast.success(`Received ${ref} from your phone`);
          go(ref);
        }
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
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(REGION_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            const ref = parseGrnReference(decoded);
            if (!ref) {
              toast.error("Not a GRN QR code");
              return;
            }
            scanner.stop().catch(() => {});
            go(ref);
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
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="bg-white p-3 rounded-md border">
                  <QRCodeSVG value={pairUrl} size={168} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan this with your phone camera to turn it into a GRN scanner. Every GRN you scan on the
                  phone opens right here automatically.
                </p>
                <p className="text-[11px] text-muted-foreground break-all">{pairUrl}</p>
                <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${paired ? "bg-green-600" : "bg-amber-500 animate-pulse"}`} />
                  {paired ? "Phone connected" : "Waiting for your phone…"}
                </p>
              </div>
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
            <p className="text-xs text-muted-foreground">Or enter the GRN number manually</p>
            <div className="flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="GRN-20260802001"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const ref = parseGrnReference(manual) || manual.trim();
                    if (ref) go(ref);
                  }
                }}
              />
              <Button
                onClick={() => {
                  const ref = parseGrnReference(manual) || manual.trim();
                  if (!ref) return toast.error("Enter a GRN number");
                  go(ref);
                }}
              >
                Open
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNScannerDialog;
