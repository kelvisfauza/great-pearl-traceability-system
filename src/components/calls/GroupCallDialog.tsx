import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users,
  Hand, MessageSquare, MonitorUp, MonitorOff, UserPlus, X, Send,
} from 'lucide-react';
import { useGroupCall, GroupParticipant } from '@/contexts/GroupCallContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import AddParticipantsDialog from './AddParticipantsDialog';

const Tile = ({ stream, name, muted, isLocal, isVideo, handRaised, sharing }: { stream: MediaStream | null; name: string; muted?: boolean; isLocal?: boolean; isVideo: boolean; handRaised?: boolean; sharing?: boolean; }) => {
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
          className={cn('w-full h-full', sharing ? 'object-contain bg-black' : 'object-cover')}
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
      {handRaised && (
        <div className="absolute top-2 left-2 text-xs text-white bg-amber-500/90 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Hand className="h-3 w-3" /> Raised
        </div>
      )}
      {sharing && (
        <div className="absolute top-2 right-2 text-xs text-white bg-emerald-600/90 px-2 py-0.5 rounded-full flex items-center gap-1">
          <MonitorUp className="h-3 w-3" /> Sharing
        </div>
      )}
      {/* Hidden audio sink to force loudspeaker on mobile */}
      {stream && !isVideo && !isLocal && (
        <video ref={ref} autoPlay playsInline className="absolute w-0 h-0 opacity-0 pointer-events-none" />
      )}
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
  } = useGroupCall();
  const { user, employee } = useAuth();
  const [panel, setPanel] = useState<null | 'chat' | 'people'>(null);
  const [chatInput, setChatInput] = useState('');
  const [addOpen, setAddOpen] = useState(false);
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
  const gridCols = count <= 2 ? 'grid-cols-1' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-background border-none flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <p className="font-semibold text-sm">{active.title || 'Group call'}</p>
              <p className="text-xs opacity-80">
                {count} {isVideo ? 'video' : 'voice'} participants
                {screenSharerId && (screenSharerId === myId ? ' · You are sharing' : ' · Someone is sharing')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-auto p-4 bg-muted/40">
            <div className={cn('grid gap-3', gridCols)}>
              <Tile
                stream={localStream}
                name={myName}
                isLocal
                isVideo={isVideo || isScreenSharing}
                handRaised={myHandRaised}
                sharing={isScreenSharing}
              />
              {others.map(p => (
                <Tile
                  key={p.userId}
                  stream={p.stream}
                  name={p.name}
                  isVideo={isVideo || screenSharerId === p.userId}
                  handRaised={handsRaised.has(p.userId)}
                  sharing={screenSharerId === p.userId}
                />
              ))}
            </div>
          </div>

          {panel && (
            <div className="w-80 border-l bg-background flex flex-col">
              <Tabs value={panel} onValueChange={(v) => setPanel(v as any)} className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-2 pt-2">
                  <TabsList>
                    <TabsTrigger value="people">People ({count})</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="icon" onClick={() => setPanel(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <TabsContent value="people" className="flex-1 overflow-hidden m-0">
                  <div className="p-2 border-b">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" /> Add people
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 h-full">
                    <ul className="divide-y">
                      <li className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium">{myName} (you){isHost ? ' · Host' : ''}</span>
                        {myHandRaised && <Hand className="h-4 w-4 text-amber-500" />}
                      </li>
                      {others.map(p => (
                        <li key={p.userId} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.joined ? 'Connected' : 'Connecting…'}</p>
                          </div>
                          <div className="flex items-center gap-2">
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

        <div className="flex flex-wrap items-center justify-center gap-2 p-3 border-t bg-background">
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
          <Button size="lg" variant={isScreenSharing ? 'success' : 'secondary'} onClick={toggleScreenShare} className="rounded-full h-12 w-12 p-0" title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
          </Button>
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
          <Button size="lg" variant="secondary" onClick={() => setAddOpen(true)} className="rounded-full h-12 w-12 p-0" title="Add people">
            <UserPlus className="h-5 w-5" />
          </Button>
          <Button size="lg" variant="destructive" onClick={leaveCall} className="rounded-full h-12 px-6">
            <PhoneOff className="h-5 w-5 mr-2" /> Leave
          </Button>
          {isHost && (
            <Button size="lg" variant="destructive" onClick={endForAll} className="rounded-full h-12 px-6">
              End for all
            </Button>
          )}
        </div>

        <AddParticipantsDialog open={addOpen} onClose={() => setAddOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default GroupCallDialog;