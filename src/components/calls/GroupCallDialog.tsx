import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users,
  Hand, MessageSquare, MonitorUp, MonitorOff, UserPlus, X, Send,
  Maximize2, Minimize2, Crown, Volume2, UserX,
} from 'lucide-react';
import { useGroupCall, GroupParticipant } from '@/contexts/GroupCallContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import AddParticipantsDialog from './AddParticipantsDialog';

// Persistent audio sink that survives tile re-layouts (e.g. when someone
// starts screen-sharing and remote tiles move from grid -> spotlight strip).
// Without this, freshly-mounted <video> elements lose the user-gesture chain
// and the browser blocks audio autoplay, so the presenter cannot hear others.
const RemoteAudioSink = ({ stream }: { stream: MediaStream | null }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
      const p = ref.current.play();
      if (p && typeof (p as any).catch === 'function') (p as any).catch(() => {});
    }
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
};

// Detect whether a stream's audio level is above a speaking threshold.
const useIsSpeaking = (stream: MediaStream | null, enabled: boolean) => {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!stream || !enabled) { setSpeaking(false); return; }
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) { setSpeaking(false); return; }
    let ctx: AudioContext | null = null;
    let raf = 0;
    let lastAbove = 0;
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      ctx = new Ctx();
      const src = ctx!.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx!.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        if (rms > 0.04) lastAbove = now;
        setSpeaking(now - lastAbove < 400);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
    return () => {
      cancelAnimationFrame(raf);
      try { ctx?.close(); } catch {}
    };
  }, [stream, enabled]);
  return speaking;
};

const Tile = ({ stream, name, muted, isLocal, isVideo, handRaised, sharing, micMuted, isHost, onForceMute, onKick }: { stream: MediaStream | null; name: string; muted?: boolean; isLocal?: boolean; isVideo: boolean; handRaised?: boolean; sharing?: boolean; micMuted?: boolean; isHost?: boolean; onForceMute?: () => void; onKick?: () => void; }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  const speaking = useIsSpeaking(stream, !micMuted);
  const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  return (
    <div className={cn(
      'relative bg-black/80 rounded-lg overflow-hidden aspect-video flex items-center justify-center transition-shadow',
      speaking && 'ring-4 ring-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.55)]'
    )}>
      {stream && isVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className={cn('w-full h-full', sharing ? 'object-contain bg-black' : 'object-cover')}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-primary-foreground">
          <div className={cn(
            'h-16 w-16 rounded-full bg-primary/40 flex items-center justify-center text-2xl font-semibold transition-shadow',
            speaking && 'ring-4 ring-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.55)]'
          )}>
            {initials}
          </div>
          {!stream && <span className="text-xs opacity-80">Connecting…</span>}
        </div>
      )}
      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">
        <span className="inline-flex items-center gap-1">
          {micMuted && <MicOff className="h-3 w-3 text-red-400" />}
          {speaking && !micMuted && <Volume2 className="h-3 w-3 text-emerald-300 animate-pulse" />}
          {name}{isLocal ? ' (you)' : ''}
        </span>
      </div>
      {isHost && (
        <div className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide text-amber-950 bg-amber-300/95 px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
          <Crown className="h-3 w-3" /> Host
        </div>
      )}
      {handRaised && (
        <div className="absolute top-2 left-2 text-xs text-white bg-amber-500/90 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Hand className="h-3 w-3" /> Raised
        </div>
      )}
      {(onForceMute || onKick) && (
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover/tile:opacity-100 transition-opacity">
          {onForceMute && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onForceMute(); }}
              className="bg-black/70 hover:bg-black/90 text-white rounded-md p-1.5"
              title={micMuted ? 'Already muted' : 'Mute this participant'}
              disabled={micMuted}
            >
              <MicOff className="h-3.5 w-3.5" />
            </button>
          )}
          {onKick && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onKick(); }}
              className="bg-red-600/90 hover:bg-red-700 text-white rounded-md p-1.5"
              title="Remove from call"
            >
              <UserX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      {sharing && (
        <div className={cn(
          'absolute text-xs text-white bg-emerald-600/95 px-2 py-0.5 rounded-full flex items-center gap-1 shadow',
          isHost ? 'top-9 right-2' : 'top-2 right-2'
        )}>
          <MonitorUp className="h-3 w-3" /> Presenting
        </div>
      )}
      {/* Audio for remote peers is played by RemoteAudioSink mounted at the
          dialog root so screen-share layout swaps don't break playback. */}
    </div>
  );
};

const GroupCallDialog = () => {
  const {
    active, participants, localStream, muted, cameraOff,
    toggleMute, toggleCamera, leaveCall, endForAll,
    handsRaised, myHandRaised, toggleHand,
    chatMessages, unreadChat, markChatRead, sendChat,
    isScreenSharing, screenSharerId, toggleScreenShare,
    mutedPeers,
  } = useGroupCall();
  const { user, employee } = useAuth();
  const [panel, setPanel] = useState<null | 'chat' | 'people'>(null);
  const [chatInput, setChatInput] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [fullView, setFullView] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (panel === 'chat') {
      markChatRead();
      requestAnimationFrame(() => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      });
    }
  }, [panel, chatMessages, markChatRead]);

  if (!active) return null;

  const myId = user?.id;
  const isHost = active.hostId === myId;
  const isVideo = active.type === 'video';
  const myName = (employee as any)?.name || user?.email || 'You';

  const others: GroupParticipant[] = Array.from(participants.values()).filter(p => p.userId !== myId);
  const count = others.length + 1;
  const connectedCount = 1 + others.filter(p => p.joined).length;
  const gridCols = count <= 2 ? 'grid-cols-1' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  // Spotlight mode: someone is sharing their screen
  const spotlightActive = !!screenSharerId;
  const someoneElseSharing = !!screenSharerId && screenSharerId !== myId;

  const tilesAll = [
    { userId: myId!, name: `${myName} (you)`, stream: localStream, isLocal: true, joined: true },
    ...others.map(p => ({ userId: p.userId, name: p.name, stream: p.stream, isLocal: false, joined: p.joined })),
  ];
  const spotlightTile = spotlightActive ? tilesAll.find(t => t.userId === screenSharerId) : null;
  const stripTiles = spotlightActive ? tilesAll.filter(t => t.userId !== screenSharerId) : [];

  const showSidePanel = !!panel && !fullView;
  const showStrip = spotlightActive && !fullView && stripTiles.length > 0;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className={cn(
          'p-0 bg-background border-none flex flex-col',
          fullView
            ? 'max-w-none w-screen h-screen rounded-none top-0 left-0 translate-x-0 translate-y-0'
            : 'max-w-5xl w-[95vw] h-[90vh]'
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        {/* Persistent audio sinks — keep remote audio playing across layout changes */}
        {others.map(p => (
          <RemoteAudioSink key={`sink-${p.userId}`} stream={p.stream} />
        ))}
        <div className={cn('flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground', fullView && 'hidden')}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <p className="font-semibold text-sm">{active.title || 'Group call'}</p>
              <p className="text-xs opacity-80">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {connectedCount} of {count} connected
                </span>
                {screenSharerId && (screenSharerId === myId ? ' · You are sharing' : ' · Someone is sharing')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className={cn('flex-1 min-w-0 flex', spotlightActive ? 'flex-row' : 'flex-col')}>
            {spotlightActive && spotlightTile ? (
              <div className={cn('flex-1 min-w-0 p-2 bg-black flex items-center justify-center')}>
                <div className="w-full h-full max-h-full">
                  <Tile
                    stream={spotlightTile.stream}
                    name={spotlightTile.name}
                    isLocal={spotlightTile.isLocal}
                    muted={spotlightTile.isLocal}
                    isVideo
                    handRaised={handsRaised.has(spotlightTile.userId)}
                    sharing
                    micMuted={spotlightTile.isLocal ? muted : mutedPeers.has(spotlightTile.userId)}
                    isHost={spotlightTile.userId === active.hostId}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4 bg-muted/40">
                <div className={cn('grid gap-3', gridCols)}>
                  <Tile
                    stream={localStream}
                    name={myName}
                    isLocal
                    isVideo={isVideo || isScreenSharing}
                    handRaised={myHandRaised}
                    sharing={isScreenSharing}
                    micMuted={muted}
                    isHost={isHost}
                  />
                  {others.map(p => (
                    <Tile
                      key={p.userId}
                      stream={p.stream}
                      name={p.name}
                      isVideo={isVideo || screenSharerId === p.userId}
                      handRaised={handsRaised.has(p.userId)}
                      sharing={screenSharerId === p.userId}
                      micMuted={mutedPeers.has(p.userId)}
                      isHost={p.userId === active.hostId}
                    />
                  ))}
                </div>
              </div>
            )}

            {showStrip && (
              <div className="w-40 shrink-0 border-l bg-background/60 overflow-y-auto p-2 space-y-2">
                {stripTiles.map(t => (
                  <div key={t.userId} className="w-full">
                    <Tile
                      stream={t.stream}
                      name={t.name}
                      isLocal={t.isLocal}
                      muted={t.isLocal}
                      isVideo={isVideo}
                      handRaised={handsRaised.has(t.userId)}
                      micMuted={t.isLocal ? muted : mutedPeers.has(t.userId)}
                      isHost={t.userId === active.hostId}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {showSidePanel && (
            <div className="w-80 border-l bg-background flex flex-col">
              <Tabs value={panel} onValueChange={(v) => setPanel(v as any)} className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-2 pt-2">
                  <TabsList>
                    <TabsTrigger value="people">People ({connectedCount}/{count})</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="icon" onClick={() => setPanel(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <TabsContent value="people" className="flex-1 overflow-hidden m-0">
                  <div className="p-2 border-b">
                    {isHost ? (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" /> Add people
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-1">Only the host can add people</p>
                    )}
                  </div>
                  <ScrollArea className="flex-1 h-full">
                    <ul className="divide-y">
                      <li className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{myName} (you){isHost ? ' · Host' : ''}</p>
                            <p className="text-xs text-emerald-600">Connected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {muted && <MicOff className="h-4 w-4 text-red-500" />}
                          {myHandRaised && <Hand className="h-4 w-4 text-amber-500" />}
                        </div>
                      </li>
                      {others.map(p => (
                        <li key={p.userId} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              {p.joined ? (
                                <>
                                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                </>
                              ) : (
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate">{p.name}</p>
                              <p className={cn('text-xs', p.joined ? 'text-emerald-600' : 'text-amber-600')}>
                                {p.joined ? 'Connected' : 'Connecting…'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {mutedPeers.has(p.userId) && <MicOff className="h-4 w-4 text-red-500" />}
                            {screenSharerId === p.userId && <MonitorUp className="h-4 w-4 text-emerald-600" />}
                            {handsRaised.has(p.userId) && <Hand className="h-4 w-4 text-amber-500" />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                  <div ref={chatScrollRef} className="flex-1 overflow-auto p-3 space-y-2">
                    {chatMessages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-6">No messages yet.</p>
                    )}
                    {chatMessages.map(m => {
                      const mine = m.fromId === myId;
                      return (
                        <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                          <span className="text-[10px] text-muted-foreground">{mine ? 'You' : m.fromName}</span>
                          <div className={cn('max-w-[85%] rounded-lg px-3 py-1.5 text-sm break-words', mine ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            {m.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (chatInput.trim()) { sendChat(chatInput); setChatInput(''); } }}
                    className="border-t p-2 flex items-center gap-2"
                  >
                    <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message…" />
                    <Button type="submit" size="icon" disabled={!chatInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <div className={cn('flex flex-wrap items-center justify-center gap-2 p-3 border-t bg-background', fullView && 'absolute bottom-2 left-1/2 -translate-x-1/2 border rounded-full px-3 py-2 bg-background/80 backdrop-blur')}>
          <Button size="lg" variant={muted ? 'destructive' : 'secondary'} onClick={toggleMute} className="rounded-full h-12 w-12 p-0">
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {isVideo && (
            <Button size="lg" variant={cameraOff ? 'destructive' : 'secondary'} onClick={toggleCamera} className="rounded-full h-12 w-12 p-0">
              {cameraOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
            </Button>
          )}
          <Button size="lg" variant={myHandRaised ? 'warning' : 'secondary'} onClick={toggleHand} className="rounded-full h-12 w-12 p-0" title={myHandRaised ? 'Lower hand' : 'Raise hand'}>
            <Hand className="h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant={isScreenSharing ? 'success' : 'secondary'}
            onClick={toggleScreenShare}
            disabled={someoneElseSharing}
            className="rounded-full h-12 w-12 p-0"
            title={someoneElseSharing ? 'Someone else is sharing' : isScreenSharing ? 'Stop sharing' : 'Share screen (one at a time)'}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
          </Button>
          {spotlightActive && (
            <Button size="lg" variant="secondary" onClick={() => setFullView(v => !v)} className="rounded-full h-12 w-12 p-0" title={fullView ? 'Exit full view' : 'Full view'}>
              {fullView ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          )}
          <Button size="lg" variant="secondary" onClick={() => setPanel(p => p === 'chat' ? null : 'chat')} className="rounded-full h-12 w-12 p-0 relative" title="Chat">
            <MessageSquare className="h-5 w-5" />
            {unreadChat > 0 && panel !== 'chat' && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setPanel(p => p === 'people' ? null : 'people')} className="rounded-full h-12 w-12 p-0" title="People">
            <Users className="h-5 w-5" />
          </Button>
          {isHost && (
            <Button size="lg" variant="secondary" onClick={() => setAddOpen(true)} className="rounded-full h-12 w-12 p-0" title="Add people">
              <UserPlus className="h-5 w-5" />
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

        {isHost && <AddParticipantsDialog open={addOpen} onClose={() => setAddOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
};

export default GroupCallDialog;