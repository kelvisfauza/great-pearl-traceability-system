import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";

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

  const go = (reference: string) => {
    onOpenChange(false);
    navigate(`/grn/${encodeURIComponent(reference)}`);
  };

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

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
          <div id={REGION_ID} className="w-full overflow-hidden rounded-md bg-muted min-h-[220px]" />
          {starting && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

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
