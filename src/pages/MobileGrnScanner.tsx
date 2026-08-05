import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parseGrnReference } from "@/components/finance/GRNScannerDialog";

const REGION_ID = "mobile-grn-reader";

export default function MobileGrnScanner() {
  const { sessionId = "" } = useParams();
  const scannerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`grn-scan-${sessionId}`, { config: { broadcast: { self: false } } });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const send = async (reference: string) => {
    await channelRef.current?.send({ type: "broadcast", event: "grn", payload: { reference } });
    setSent(reference);
    toast.success(`Sent ${reference} to the system`);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(REGION_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => {
            const ref = parseGrnReference(decoded);
            if (!ref) return;
            send(ref);
          },
          () => {}
        );
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Unable to access the camera");
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
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5" /> Scan GRN
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Point the camera at the QR code on a printed GRN. It opens instantly on the paired computer.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div id={REGION_ID} className="w-full rounded-md overflow-hidden bg-muted min-h-[260px]" />
          {starting && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {sent && (
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Sent {sent} — check the computer screen.
            </p>
          )}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">Or type the GRN number</p>
            <div className="flex gap-2">
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="GRN-20260802001" />
              <Button
                onClick={() => {
                  const ref = parseGrnReference(manual) || manual.trim();
                  if (!ref) return toast.error("Enter a GRN number");
                  send(ref);
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
