import { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users } from 'lucide-react';
import { useGroupCall, GroupParticipant } from '@/contexts/GroupCallContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const Tile = ({ stream, name, muted, isLocal, isVideo }: { stream: MediaStream | null; name: string; muted?: boolean; isLocal?: boolean; isVideo: boolean }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  return (
    <div className="relative bg-black/80 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      {stream && isVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={!!muted || !!isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-primary-foreground">
          <div className="h-16 w-16 rounded-full bg-primary/40 flex items-center justify-center text-2xl font-semibold">
            {initials}
          </div>
          {!stream && <span className="text-xs opacity-80">Connecting…</span>}
        </div>
      )}
      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">
        {name}{isLocal ? ' (you)' : ''}
      </div>
      {/* Hidden audio sink to force loudspeaker on mobile */}
      {stream && !isVideo && !isLocal && (
        <video ref={ref} autoPlay playsInline className="absolute w-0 h-0 opacity-0 pointer-events-none" />
      )}
    </div>
  );
};

const GroupCallDialog = () => {
  const { active, participants, localStream, muted, cameraOff, toggleMute, toggleCamera, leaveCall, endForAll } = useGroupCall();
  const { user, employee } = useAuth();
  if (!active) return null;

  const myId = user?.id;
  const isHost = active.hostId === myId;
  const isVideo = active.type === 'video';
  const myName = (employee as any)?.name || user?.email || 'You';

  const others: GroupParticipant[] = Array.from(participants.values()).filter(p => p.userId !== myId);
  const count = others.length + 1;
  const gridCols = count <= 2 ? 'grid-cols-1' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-background border-none flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <p className="font-semibold text-sm">{active.title || 'Group call'}</p>
              <p className="text-xs opacity-80">{count} {isVideo ? 'video' : 'voice'} participants</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-muted/40">
          <div className={cn('grid gap-3', gridCols)}>
            <Tile stream={localStream} name={myName} isLocal isVideo={isVideo} />
            {others.map(p => (
              <Tile key={p.userId} stream={p.stream} name={p.name} isVideo={isVideo} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 p-4 border-t bg-background">
          <Button size="lg" variant={muted ? 'destructive' : 'secondary'} onClick={toggleMute} className="rounded-full h-12 w-12 p-0">
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {isVideo && (
            <Button size="lg" variant={cameraOff ? 'destructive' : 'secondary'} onClick={toggleCamera} className="rounded-full h-12 w-12 p-0">
              {cameraOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
            </Button>
          )}
          <Button size="lg" variant="destructive" onClick={leaveCall} className="rounded-full h-12 px-6">
            <PhoneOff className="h-5 w-5 mr-2" /> Leave
          </Button>
          {isHost && (
            <Button size="lg" variant="destructive" onClick={endForAll} className="rounded-full h-12 px-6">
              End for all
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupCallDialog;