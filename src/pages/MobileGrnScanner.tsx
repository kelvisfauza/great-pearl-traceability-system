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
const PHOTO_REGION_ID = "mobile-grn-photo-reader";

export default function MobileGrnScanner() {
  const { sessionId = "" } = useParams();
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nativeMode, setNativeMode] = useState(false);
  const channelRef = useRef<any>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [sentList, setSentList] = useState<string[]>([]);
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const lastSentRef = useRef<string>("");

  const deviceName = (() => {
    const ua = navigator.userAgent;
    const model = ua.match(/\(([^)]+)\)/)?.[1]?.split(";").map((s) => s.trim()).filter(Boolean) || [];
    const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone" : "Phone";
    const label = model.find((m) => !/Linux|U;|wv|CPU|Mozilla|rv:/i.test(m) && m.length < 30);
    return label ? `${label} (${os})` : os;
  })();

  useEffect(() => {
    const channel = supabase.channel(`grn-scan-${sessionId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "ping" }, () => {
        channel.send({ type: "broadcast", event: "hello", payload: { device: deviceName } });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "hello", payload: { device: deviceName } });
        }
      });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const send = async (reference: string) => {
    if (lastSentRef.current === reference) return;
    lastSentRef.current = reference;
    setTimeout(() => {
      if (lastSentRef.current === reference) lastSentRef.current = "";
    }, 3000);
    await channelRef.current?.send({ type: "broadcast", event: "grn", payload: { reference, device: deviceName } });
    setSent(reference);
    setSentList((prev) => (prev.includes(reference) ? prev : [...prev, reference]));
    toast.success(`Sent ${reference} to the system`);
  };

  // 1) Native BarcodeDetector (fast + reliable on Android Chrome), 2) html5-qrcode fallback.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;

    const onDecoded = (decoded: string) => {
      setLastRaw(decoded);
      const ref = parseGrnReference(decoded);
      if (ref) send(ref);
    };

    const startNative = async () => {
      // Safari exposes BarcodeDetector on some iPhones but frequently fails to
      // decode small printed QR codes from a live video frame. Let html5-qrcode
      // use its cropped ZXing pipeline on iOS instead.
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return false;
      const Detector = (window as any).BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) return false;
      let detector: any;
      try {
        const supported = await Detector.getSupportedFormats?.();
        if (supported && !supported.includes("qr_code")) return false;
        detector = new Detector({ formats: ["qr_code", "code_128", "code_39", "ean_13"] });
      } catch {
        return false;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        return false;
      }
      const video = videoRef.current;
      if (!video || cancelled) return false;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play().catch(() => {});
      setNativeMode(true);
      const tick = async () => {
        if (cancelled) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            if (codes?.length) onDecoded(codes[0].rawValue || "");
          }
        } catch {
          /* keep scanning */
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return true;
    };

    const startFallback = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const { Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(REGION_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: false,
        verbose: false,
      } as any);
      scannerRef.current = scanner;
      // A large square scan region gives the decoder many more QR pixels while
      // still accepting the full-frame fallback on unusual camera dimensions.
      const configs = [
        {
          fps: 15,
          qrbox: (viewWidth: number, viewHeight: number) => {
            const size = Math.floor(Math.min(viewWidth, viewHeight) * 0.86);
            return { width: size, height: size };
          },
          disableFlip: true,
        },
        { fps: 15, disableFlip: true },
      ];
      let lastErr: any = null;
      for (const cfg of configs) {
        try {
          await scanner.start({ facingMode: "environment" }, cfg as any, onDecoded, () => {});
          // Existing GRNs have a physically small QR in the footer. Ask the
          // rear camera for optical/digital zoom and continuous focus where
          // the browser exposes those controls (notably iPhone Safari).
          try {
            const capabilities = scanner.getRunningTrackCapabilities?.() as any;
            const advanced: Record<string, unknown> = {};
            if (capabilities?.zoom) {
              advanced.zoom = Math.min(3, Number(capabilities.zoom.max || 2));
            }
            if (Array.isArray(capabilities?.focusMode) && capabilities.focusMode.includes("continuous")) {
              advanced.focusMode = "continuous";
            }
            if (Object.keys(advanced).length) {
              await scanner.applyVideoConstraints({ advanced: [advanced] } as any);
            }
          } catch {
            // Scanning still works on browsers that do not expose camera controls.
          }
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      try {
        await scanner.start({ facingMode: "user" }, { fps: 15 } as any, onDecoded, () => {});
        return;
      } catch (e) {
        lastErr = e;
      }
      throw lastErr;
    };

    (async () => {
      try {
        const ok = await startNative();
        if (!ok && !cancelled) await startFallback();
      } catch (e: any) {
        if (!cancelled)
          setError(
            e?.message ||
              "Unable to access the camera. Allow camera permission for this site, then reload — or type the pay code below.",
          );
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) s.stop().then(() => s.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Last-resort: decode a photo of the QR taken with the camera app.
  const scanFromPhoto = async (file: File) => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tmp = new Html5Qrcode(PHOTO_REGION_ID, { verbose: false } as any);
      const decoded = await tmp.scanFile(file, true);
      setLastRaw(decoded);
      const ref = parseGrnReference(decoded);
      if (ref) send(ref);
      else toast.error("That photo is not a GRN code");
      await tmp.clear();
    } catch {
      toast.error("Could not read a code from that photo — try a closer, sharper shot");
    }
  };


  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5" /> Scan GRN
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Point the camera at the QR code on a printed GRN. The first one opens on the paired computer and
            every extra scan is added to the pay queue — keep scanning all the GRNs you want to pay.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="w-full rounded-md overflow-hidden bg-muted min-h-[260px] relative">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${nativeMode ? "" : "hidden"}`}
            />
            <div id={REGION_ID} className={nativeMode ? "hidden" : "w-full"} />
          </div>
          <div id={PHOTO_REGION_ID} className="hidden" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Camera not reading it? Take a photo of the QR instead</p>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) scanFromPhoto(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
          {starting && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!sent && lastRaw && !parseGrnReference(lastRaw) && (
            <p className="text-xs text-amber-600 break-all">
              Read a code but it is not a GRN: {lastRaw}. Type the GRN number below instead.
            </p>
          )}
          {sent && (
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Sent {sent} — check the computer screen.
            </p>
          )}
          {sentList.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Sent this session ({sentList.length})</p>
              <div className="flex flex-wrap gap-1">
                {sentList.map((r) => (
                  <span key={r} className="rounded-full border px-2 py-0.5">{r}</span>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">Or type the pay code printed under the QR</p>
            <div className="flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value.toUpperCase())}
                placeholder="GAC-K7Q-M4X-T9"
              />
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
