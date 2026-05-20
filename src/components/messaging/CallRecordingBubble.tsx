import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Mic, Download, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Props {
  message: any;
  isOwnMessage: boolean;
}

const fmtDuration = (s: number) => {
  const m = Math.floor((s || 0) / 60);
  const sec = (s || 0) % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const CallRecordingBubble = ({ message, isOwnMessage }: Props) => {
  const md = message.metadata || {};
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string>(md.signed_url || message.content || '');

  useEffect(() => {
    // Refresh signed URL if missing or likely expired (>20h old)
    const ageHours = (Date.now() - new Date(message.created_at).getTime()) /
      36e5;
    if (md.storage_path && (!url || ageHours > 20)) {
      supabase.storage
        .from('call-recordings')
        .createSignedUrl(md.storage_path, 60 * 60 * 24)
        .then(({ data }) => {
          if (data?.signedUrl) setUrl(data.signedUrl);
        });
    }
  }, [md.storage_path]); // eslint-disable-line

  const expiresAt = md.expires_at ? new Date(md.expires_at) : null;
  const transcript = md.transcript || '';
  const transcriptError = md.transcript_error;

  return (
    <div className="min-w-[260px] max-w-[340px] space-y-2">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          isOwnMessage ? 'bg-primary-foreground/15' : 'bg-primary/10 text-primary'
        }`}>
          <Mic className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">
            Call recording · {md.title || 'Group call'}
          </p>
          <p className={`text-[10px] ${isOwnMessage ? 'opacity-70' : 'text-muted-foreground'}`}>
            {fmtDuration(md.duration_seconds)} · {format(new Date(message.created_at), 'MMM d, HH:mm')}
          </p>
        </div>
      </div>

      {url ? (
        <audio controls src={url} className="w-full h-9" />
      ) : (
        <p className="text-xs italic opacity-70">Audio unavailable</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={isOwnMessage ? 'secondary' : 'outline'}
          className="h-7 px-2 text-xs"
          onClick={() => setOpen(v => !v)}
        >
          {open ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          Transcript
        </Button>
        {url && (
          <a
            href={url}
            download={md.fileName || 'recording.webm'}
            className={`text-xs inline-flex items-center gap-1 hover:underline ${
              isOwnMessage ? 'opacity-90' : 'text-muted-foreground'
            }`}
          >
            <Download className="h-3 w-3" /> Download
          </a>
        )}
      </div>

      {open && (
        <div className={`rounded p-2 text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto ${
          isOwnMessage ? 'bg-primary-foreground/10' : 'bg-muted/60'
        }`}>
          {transcript
            ? transcript
            : transcriptError
              ? `Transcript failed: ${transcriptError}`
              : 'No transcript available.'}
        </div>
      )}

      {expiresAt && (
        <p className={`text-[10px] flex items-center gap-1 ${
          isOwnMessage ? 'opacity-70' : 'text-muted-foreground'
        }`}>
          <Clock className="h-3 w-3" />
          Auto-deletes {format(expiresAt, 'MMM d, yyyy')}
        </p>
      )}
    </div>
  );
};

export default CallRecordingBubble;