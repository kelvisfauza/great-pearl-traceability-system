import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StartArgs {
  callId: string;
  hostUserId: string;
  hostName?: string;
  title?: string | null;
  getStreams: () => MediaStream[];
}

export const useCallRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const argsRef = useRef<StartArgs | null>(null);
  const { toast } = useToast();

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanup = useCallback(() => {
    stopTimer();
    setIsRecording(false);
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    destRef.current = null;
    recorderRef.current = null;
  }, []);

  const start = useCallback(async (args: StartArgs) => {
    if (recorderRef.current) return;
    try {
      const AudioCtx: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();

      const streams = args.getStreams();
      let attached = 0;
      for (const s of streams) {
        const audio = s?.getAudioTracks?.() || [];
        if (!audio.length) continue;
        try {
          const src = ctx.createMediaStreamSource(new MediaStream(audio));
          src.connect(dest);
          attached++;
        } catch (e) {
          console.warn('attach stream failed', e);
        }
      }
      if (attached === 0) {
        ctx.close();
        toast({
          title: 'No audio to record',
          description: 'Unmute or wait for someone to speak before recording.',
          variant: 'destructive',
        });
        return;
      }

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const recorder = mime
        ? new MediaRecorder(dest.stream, { mimeType: mime })
        : new MediaRecorder(dest.stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const duration = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const a = argsRef.current!;
        cleanup();
        if (blob.size < 1000) {
          toast({ title: 'Recording too short', variant: 'destructive' });
          return;
        }
        setIsUploading(true);
        try {
          const ext = type.includes('mp4') ? 'm4a' : 'webm';
          const path = `${a.hostUserId}/${a.callId}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('call-recordings')
            .upload(path, blob, { contentType: type, upsert: false });
          if (upErr) throw upErr;

          const { data, error } = await supabase.functions.invoke(
            'transcribe-call-recording',
            {
              body: {
                call_id: a.callId,
                storage_path: path,
                duration_seconds: duration,
                mime_type: type,
                host_name: a.hostName,
                title: a.title,
              },
            },
          );
          if (error) throw error;
          if (data && (data as any).ok === false) {
            throw new Error((data as any).error || 'Transcription failed');
          }
          toast({
            title: 'Recording saved',
            description: 'Transcript shared in chat. Auto-deletes in 30 days.',
          });
        } catch (e: any) {
          console.error('Upload/transcribe failed', e);
          toast({
            title: 'Could not save recording',
            description: e?.message || 'Try again.',
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
        }
      };

      recorderRef.current = recorder;
      audioCtxRef.current = ctx;
      destRef.current = dest;
      argsRef.current = args;
      startedAtRef.current = Date.now();
      setSeconds(0);
      recorder.start(1000);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 500);
      toast({
        title: 'Recording started',
        description: 'Only you (host) and system admin will receive it.',
      });
    } catch (e: any) {
      console.error('Recording start failed', e);
      cleanup();
      toast({
        title: 'Could not start recording',
        description: e?.message || 'Try again.',
        variant: 'destructive',
      });
    }
  }, [cleanup, toast]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (!r) return;
    try { r.stop(); } catch {}
    stopTimer();
  }, []);

  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop(); } catch {}
      cleanup();
    };
  }, [cleanup]);

  return { isRecording, isUploading, seconds, start, stop };
};