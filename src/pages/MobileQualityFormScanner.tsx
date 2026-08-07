import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parseQualityFormCode } from "@/components/quality/QualityFormScanDialog";

const REGION_ID = "mobile-qa-reader";

/** Phone-side scanner: reads the QR on a stamped analysis form and pushes the code to the paired computer. */
export default function MobileQualityFormScanner() {
  const { sessionId = "" } = useParams();
  const scannerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const lastSentRef = useRef<string>("");

  const deviceName = (() => {
    const ua = navigator.userAgent;
    return /Android/i.test(ua) ? "Android phone" : /iPhone|iPad/i.test(ua) ? "iPhone" : "Phone";
  })();

  useEffect(() => {
    const channel = supabase.channel(`qa-scan-${sessionId}`, { config: { broadcast: { self: false } } });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "hello", payload: { device: deviceName } });
      }
    });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const send = async (code: string) => {
    if (lastSentRef.current === code) return;
    lastSentRef.current = code;
    setTimeout(() => { if (lastSentRef.current === code) lastSentRef.current = ""; }, 3000);
    await channelRef.current?.send({ type: "broadcast", event: "qa-form", payload: { code, device: deviceName } });
    setSent(code);
    toast.success(`Sent ${code} to the computer`);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(REGION_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        } as any);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: (vw: number, vh: number) => {
            const size = Math.floor(Math.min(vw, vh) * 0.8);
            return { width: size, height: size };
          } } as any,
          (decoded: string) => {
            const code = parseQualityFormCode(decoded);
            if (code) send(code);
          },
          () => {},
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
            <QrCode className="h-5 w-5" /> Scan analysis form
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Point the camera at the QR on the stamped analysis sheet. The form opens on the paired computer.
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
            <p className="text-xs text-muted-foreground">Or type the code printed under the QR</p>
            <div className="flex gap-2">
              <Input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="GAC-QA-0001" />
              <Button onClick={() => {
                const code = parseQualityFormCode(manual);
                if (!code) return toast.error("Enter the form code");
                send(code);
              }}>Send</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}