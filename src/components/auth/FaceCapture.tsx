import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, AlertCircle, ScanFace } from 'lucide-react';
import { getFaceDescriptor, loadFaceModels } from '@/lib/faceApi';

interface FaceCaptureProps {
  /** Called with a 128-d face descriptor once a face is captured. */
  onCapture: (descriptor: number[]) => void | Promise<void>;
  /** Button label, defaults to "Capture face". */
  actionLabel?: string;
  /** Disable the capture button (e.g. while parent is processing). */
  disabled?: boolean;
  /** Whether the parent is currently processing the captured descriptor. */
  busy?: boolean;
  /** When true, continuously scan the camera and auto-submit the first detected face. */
  autoScan?: boolean;
  /** When true, show a green success ring and stop scanning. */
  verified?: boolean;
}

/**
 * Reusable webcam + face-api.js capture surface. Starts the camera on mount,
 * loads models in parallel, and exposes a single "Capture" action that
 * returns a face descriptor to the parent.
 */
export const FaceCapture: React.FC<FaceCaptureProps> = ({
  onCapture,
  actionLabel = 'Capture face',
  disabled,
  busy,
  autoScan = false,
  verified = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string>('');
  const [hint, setHint] = useState<string>('');
  const scanLockRef = useRef(false);

  // Start camera + load models
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        // Kick off model load in parallel with camera permission
        loadFaceModels()
          .then(() => {
            if (!cancelled) setModelsReady(true);
          })
          .catch((e) => {
            console.error('Face model load failed:', e);
            if (!cancelled) setError('Could not load face recognition models. Check your internet connection.');
          });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setCameraReady(true);
        }
      } catch (err: any) {
        console.error('Camera error:', err);
        if (err?.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (err?.name === 'NotFoundError') {
          setError('No camera detected on this device.');
        } else {
          setError('Could not access camera. Please try again.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !modelsReady || !cameraReady) return;
    setCapturing(true);
    setError('');
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setError('No face detected. Center your face in the frame and try again.');
        return;
      }
      await onCapture(descriptor);
    } catch (err) {
      console.error('Face capture failed:', err);
      setError('Face capture failed. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const ready = modelsReady && cameraReady;

  // ── Auto-scan loop ──
  // Continuously sample the camera every ~600ms. The very first frame that
  // contains a face is submitted to the parent. While the parent is busy
  // verifying we pause; if it comes back without success, we resume scanning.
  useEffect(() => {
    if (!autoScan || !ready || busy || disabled || capturing || verified) return;
    let cancelled = false;
    setHint('Looking for your face…');

    const tick = async () => {
      if (cancelled || scanLockRef.current) return;
      if (!videoRef.current) return;
      scanLockRef.current = true;
      try {
        const descriptor = await getFaceDescriptor(videoRef.current);
        if (cancelled) return;
        if (descriptor) {
          setHint('Face detected — verifying…');
          setError('');
          await onCapture(descriptor);
        } else {
          setHint('Looking for your face…');
        }
      } catch (e) {
        console.error('auto-scan error:', e);
      } finally {
        scanLockRef.current = false;
      }
    };

    const id = window.setInterval(tick, 700);
    // fire one immediately too
    tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [autoScan, ready, busy, disabled, capturing, verified, onCapture]);

  // Stop the camera as soon as we're verified — frees the webcam and
  // guarantees no further frames can be submitted.
  useEffect(() => {
    if (verified && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [verified]);

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-xl border bg-black/90 aspect-[4/3]">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {/* Framing oval */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={`w-[58%] h-[78%] rounded-[50%] border-[3px] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-all duration-300 ${
              verified
                ? 'border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35),0_0_40px_8px_rgba(16,185,129,0.6)] animate-pulse'
                : 'border-white/70'
            }`}
          />
        </div>
        {verified && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified — signing you in
          </div>
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white text-sm">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>
              {modelsReady ? 'Starting camera…' : 'Loading face models…'}
            </span>
          </div>
        )}
        {ready && autoScan && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {busy ? 'Verifying…' : hint || 'Scanning…'}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {!autoScan && (
        <Button
          onClick={handleCapture}
          disabled={!ready || disabled || capturing || busy}
          className="w-full"
          size="lg"
        >
          {capturing || busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {busy ? 'Verifying…' : 'Analyzing…'}
            </>
          ) : (
            <>
              <ScanFace className="mr-2 h-5 w-5" />
              {actionLabel}
            </>
          )}
        </Button>
      )}

      <p className="text-[11px] text-muted-foreground text-center leading-snug">
        <Camera className="inline h-3 w-3 mr-1" />
        {autoScan
          ? 'Glance at the camera — we’ll recognize you automatically. Good lighting helps.'
          : 'Look straight at the camera with good lighting. Remove glasses or masks if possible.'}
      </p>
    </div>
  );
};