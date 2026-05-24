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
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string>('');

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
          <div className="w-[58%] h-[78%] rounded-[50%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white text-sm">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>
              {modelsReady ? 'Starting camera…' : 'Loading face models…'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

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

      <p className="text-[11px] text-muted-foreground text-center leading-snug">
        <Camera className="inline h-3 w-3 mr-1" />
        Look straight at the camera with good lighting. Remove glasses or masks if possible.
      </p>
    </div>
  );
};