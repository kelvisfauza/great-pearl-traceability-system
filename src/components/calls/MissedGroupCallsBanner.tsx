import { Phone, Video as VideoIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGroupCall } from '@/contexts/GroupCallContext';

const timeAgo = (at: number) => {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

const MissedGroupCallsBanner = () => {
  const { missedGroupCalls, rejoinGroupCall, dismissMissed, active, incoming } = useGroupCall();
  if (active || incoming || missedGroupCalls.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-80 space-y-2">
      {missedGroupCalls.slice(-3).map(m => (
        <div key={m.callId} className="rounded-lg border bg-card shadow-lg p-3 flex items-start gap-3 animate-in slide-in-from-right">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {m.type === 'video' ? <VideoIcon className="h-5 w-5 text-primary" /> : <Phone className="h-5 w-5 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">Missed {m.type} call</p>
            <p className="text-xs text-muted-foreground truncate">
              {m.title || `From ${m.hostName}`} · {timeAgo(m.at)}
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => rejoinGroupCall(m.callId)}>Rejoin</Button>
              <Button size="sm" variant="ghost" onClick={() => dismissMissed(m.callId)}>Dismiss</Button>
            </div>
          </div>
          <button
            onClick={() => dismissMissed(m.callId)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default MissedGroupCallsBanner;