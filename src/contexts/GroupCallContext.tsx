import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type GroupCallType = 'audio' | 'video';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 4,
};

export const GROUP_CALL_SOFT_LIMIT = 6;
export const GROUP_CALL_HARD_LIMIT = 8;

const DEPT_KEYWORDS = [
  'department', 'dept', 'team', 'quality', 'finance', 'hr', 'human resource',
  'procurement', 'operations', 'milling', 'logistics', 'sales', 'marketing',
  'store', 'warehouse', 'admin', 'management', 'board', 'staff meeting'
];

const isDepartmentalTitle = (title?: string | null) => {
  if (!title) return false;
  const t = title.toLowerCase();
  return DEPT_KEYWORDS.some(k => t.includes(k));
};

const awardMeetingLoyalty = async (userId: string, title: string | null, callId: string) => {
  const activity = isDepartmentalTitle(title) ? 'departmental_meeting' : 'group_meeting';
  try {
    await supabase.rpc('award_activity_reward' as any, {
      user_uuid: userId,
      activity_name: activity,
      context: { description: `attending ${title || 'a group meeting'}`, call_id: callId }
    });
  } catch (err) {
    console.warn('Loyalty reward for meeting failed (non-fatal):', err);
  }
};

export interface GroupParticipant {
  userId: string;
  name: string;
  stream: MediaStream | null;
  joined: boolean;
}

export interface GroupCall {
  id: string;
  hostId: string;
  type: GroupCallType;
  title: string | null;
  conversationId: string | null;
}

export interface IncomingGroupCall {
  callId: string;
  hostId: string;
  hostName: string;
  type: GroupCallType;
  title: string | null;
}

export interface MissedGroupCall {
  callId: string;
  hostId: string;
  hostName: string;
  type: GroupCallType;
  title: string | null;
  at: number;
}

export interface GroupChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  text: string;
  at: number;
}

interface GroupCallContextValue {
  active: GroupCall | null;
  participants: Map<string, GroupParticipant>;
  incoming: IncomingGroupCall | null;
  muted: boolean;
  cameraOff: boolean;
  localStream: MediaStream | null;
  handsRaised: Set<string>;
  myHandRaised: boolean;
  mutedPeers: Set<string>;
  chatMessages: GroupChatMessage[];
  unreadChat: number;
  markChatRead: () => void;
  isScreenSharing: boolean;
  screenSharerId: string | null;
  startGroupCall: (opts: { type: GroupCallType; invitees: { userId: string; name: string }[]; title?: string; conversationId?: string | null; }) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => Promise<void>;
  leaveCall: () => Promise<void>;
  endForAll: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleHand: () => void;
  sendChat: (text: string) => void;
  toggleScreenShare: () => Promise<void>;
  addParticipants: (invitees: { userId: string; name: string }[]) => Promise<void>;
  missedGroupCalls: MissedGroupCall[];
  rejoinGroupCall: (callId: string) => Promise<void>;
  dismissMissed: (callId: string) => void;
  forceMuteParticipant: (userId: string) => void;
  removeParticipantFromCall: (userId: string) => Promise<void>;
}

const GroupCallContext = createContext<GroupCallContextValue | null>(null);

export const useGroupCall = () => {
  const ctx = useContext(GroupCallContext);
  if (!ctx) throw new Error('useGroupCall must be used within GroupCallProvider');
  return ctx;
};

interface PeerEntry {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  remoteSet: boolean;
}

export const GroupCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const myId = user?.id || null;

  const [active, setActive] = useState<GroupCall | null>(null);
  const [participants, setParticipants] = useState<Map<string, GroupParticipant>>(new Map());
  const [incoming, setIncoming] = useState<IncomingGroupCall | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [handsRaised, setHandsRaised] = useState<Set<string>>(new Set());
  const [mutedPeers, setMutedPeers] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<GroupChatMessage[]>([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharerId, setScreenSharerId] = useState<string | null>(null);
  const [missedGroupCalls, setMissedGroupCalls] = useState<MissedGroupCall[]>([]);

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef<GroupCall | null>(null);
  const nameByUserRef = useRef<Map<string, string>>(new Map());
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerRetryTimersRef = useRef<Map<string, number>>(new Map());
  const channelRetryTimerRef = useRef<number | null>(null);
  const reconnectPeerRef = useRef<(peerId: string) => void>(() => {});
  const rejoinChannelRef = useRef<() => void>(() => {});
  const interactedRef = useRef<boolean>(false);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  const updateParticipant = useCallback((userId: string, patch: Partial<GroupParticipant>) => {
    setParticipants(prev => {
      const next = new Map(prev);
      const existing = next.get(userId) || {
        userId,
        name: nameByUserRef.current.get(userId) || 'Participant',
        stream: null,
        joined: false,
      };
      next.set(userId, { ...existing, ...patch });
      return next;
    });
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants(prev => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const cleanupPeer = useCallback((userId: string) => {
    const entry = peersRef.current.get(userId);
    if (entry) {
      try { entry.pc.close(); } catch {}
      peersRef.current.delete(userId);
    }
    const t = peerRetryTimersRef.current.get(userId);
    if (t) { window.clearTimeout(t); peerRetryTimersRef.current.delete(userId); }
    removeParticipant(userId);
  }, [removeParticipant]);

  const cleanupAll = useCallback(() => {
    peersRef.current.forEach((_, id) => cleanupPeer(id));
    peersRef.current.clear();
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    cameraTrackRef.current = null;
    setLocalStream(null);
    setParticipants(new Map());
    setActive(null);
    setMuted(false);
    setCameraOff(false);
    setHandsRaised(new Set());
    setMutedPeers(new Set());
    setChatMessages([]);
    setUnreadChat(0);
    setIsScreenSharing(false);
    setScreenSharerId(null);
    interactedRef.current = false;
  }, [cleanupPeer]);

  const sendSignal = useCallback((event: string, payload: any) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const createPeer = useCallback((peerId: string, callType: GroupCallType): PeerEntry => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    const entry: PeerEntry = { pc, pendingIce: [], remoteSet: false };
    peersRef.current.set(peerId, entry);

    // Add local tracks
    const local = localStreamRef.current;
    if (local) local.getTracks().forEach(t => pc.addTrack(t, local));

    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      updateParticipant(peerId, { stream, joined: true });
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendSignal('ice', { to: peerId, from: myId, candidate: ev.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        updateParticipant(peerId, { joined: true });
        const t = peerRetryTimersRef.current.get(peerId);
        if (t) { window.clearTimeout(t); peerRetryTimersRef.current.delete(peerId); }
        return;
      }
      if (state === 'disconnected' || state === 'failed') {
        updateParticipant(peerId, { joined: false });
        // First try ICE restart (cheap). If still bad after 6s, full re-handshake.
        if (myId && myId < peerId) {
          try { (pc as any).restartIce?.(); } catch {}
        }
        const existingTimer = peerRetryTimersRef.current.get(peerId);
        if (existingTimer) window.clearTimeout(existingTimer);
        const timer = window.setTimeout(() => {
          const current = peersRef.current.get(peerId);
          if (!current) return;
          const s = current.pc.connectionState;
          if (s !== 'connected') {
            reconnectPeerRef.current(peerId);
          }
        }, state === 'failed' ? 2500 : 6000);
        peerRetryTimersRef.current.set(peerId, timer);
      }
    };

    return entry;
  }, [myId, sendSignal, updateParticipant]);

  const handleOffer = useCallback(async (fromId: string, sdp: RTCSessionDescriptionInit) => {
    if (!myId || !activeRef.current) return;
    let entry = peersRef.current.get(fromId);
    if (!entry) entry = createPeer(fromId, activeRef.current.type);
    await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    entry.remoteSet = true;
    for (const c of entry.pendingIce) {
      try { await entry.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    entry.pendingIce = [];
    const answer = await entry.pc.createAnswer();
    await entry.pc.setLocalDescription(answer);
    sendSignal('answer', { to: fromId, from: myId, sdp: answer });
    updateParticipant(fromId, { joined: true });
  }, [createPeer, myId, sendSignal, updateParticipant]);

  const handleAnswer = useCallback(async (fromId: string, sdp: RTCSessionDescriptionInit) => {
    const entry = peersRef.current.get(fromId);
    if (!entry) return;
    await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    entry.remoteSet = true;
    for (const c of entry.pendingIce) {
      try { await entry.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    entry.pendingIce = [];
    updateParticipant(fromId, { joined: true });
  }, [updateParticipant]);

  const handleIce = useCallback(async (fromId: string, candidate: RTCIceCandidateInit) => {
    const entry = peersRef.current.get(fromId);
    if (!entry) return;
    if (!entry.remoteSet) {
      entry.pendingIce.push(candidate);
      return;
    }
    try { await entry.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
  }, []);

  const handlePeerJoin = useCallback(async (peerId: string, name?: string) => {
    if (!myId || peerId === myId || !activeRef.current) return;
    if (name) nameByUserRef.current.set(peerId, name);
    updateParticipant(peerId, { name: name || nameByUserRef.current.get(peerId) || 'Participant' });
    // Glare rule: smaller userId initiates offer
    if (myId < peerId) {
      const existing = peersRef.current.get(peerId);
      // If we already started negotiating with this peer, don't start over —
      // a duplicate join/hello must not blow away an in-flight or established
      // connection (which would leave both sides without a working pc).
      if (existing && existing.pc.signalingState !== 'closed' && existing.pc.signalingState !== 'stable') return;
      if (existing && existing.pc.connectionState === 'connected') return;
      const entry = existing ?? createPeer(peerId, activeRef.current.type);
      try {
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        sendSignal('offer', { to: peerId, from: myId, sdp: offer, name: nameByUserRef.current.get(myId) });
      } catch (err) {
        console.warn('[group-call] createOffer failed', err);
      }
    }
  }, [createPeer, myId, sendSignal, updateParticipant]);

  // Wired up after handlePeerJoin is defined to avoid TDZ issues.
  useEffect(() => {
    reconnectPeerRef.current = (peerId: string) => {
      const entry = peersRef.current.get(peerId);
      if (entry) {
        try { entry.pc.close(); } catch {}
        peersRef.current.delete(peerId);
      }
      updateParticipant(peerId, { joined: false });
      // Re-announce so the other side learns we want a fresh negotiation.
      sendSignal('join', { from: myId, name: nameByUserRef.current.get(myId || '') });
      // Glare-rule offerer kicks it off; otherwise we wait for their hello/offer.
      handlePeerJoin(peerId, nameByUserRef.current.get(peerId));
    };
  }, [handlePeerJoin, myId, sendSignal, updateParticipant]);

  const joinChannel = useCallback((callId: string) => {
    if (!myId) return;
    const ch = supabase
      .channel(`group-call:${callId}`, { config: { broadcast: { ack: false, self: false } } })
      .on('broadcast', { event: 'join' }, ({ payload }) => {
        if (payload.from === myId) return;
        handlePeerJoin(payload.from, payload.name);
        // Reply directly so the newcomer learns we exist — the glare
        // rule (smaller userId offers) only works if BOTH sides know
        // about each other.
        channelRef.current?.send({
          type: 'broadcast',
          event: 'hello',
          payload: { from: myId, to: payload.from, name: nameByUserRef.current.get(myId) },
        });
      })
      .on('broadcast', { event: 'hello' }, ({ payload }) => {
        if (payload.to !== myId || payload.from === myId) return;
        handlePeerJoin(payload.from, payload.name);
      })
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.to !== myId) return;
        if (payload.name) nameByUserRef.current.set(payload.from, payload.name);
        handleOffer(payload.from, payload.sdp);
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.to !== myId) return;
        handleAnswer(payload.from, payload.sdp);
      })
      .on('broadcast', { event: 'ice' }, ({ payload }) => {
        if (payload.to !== myId) return;
        handleIce(payload.from, payload.candidate);
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        cleanupPeer(payload.from);
      })
      .on('broadcast', { event: 'hand' }, ({ payload }) => {
        setHandsRaised(prev => {
          const next = new Set(prev);
          if (payload.raised) next.add(payload.from); else next.delete(payload.from);
          return next;
        });
      })
      .on('broadcast', { event: 'mute' }, ({ payload }) => {
        setMutedPeers(prev => {
          const next = new Set(prev);
          if (payload.muted) next.add(payload.from); else next.delete(payload.from);
          return next;
        });
      })
      .on('broadcast', { event: 'force_mute' }, ({ payload }) => {
        if (payload.to !== myId) return;
        const s = localStreamRef.current;
        if (!s) return;
        const anyEnabled = s.getAudioTracks().some(t => t.enabled);
        if (anyEnabled) {
          s.getAudioTracks().forEach(t => (t.enabled = false));
          setMuted(true);
          sendSignal('mute', { from: myId, muted: true });
          toast({ title: 'You were muted by the host' });
        }
      })
      .on('broadcast', { event: 'kick' }, ({ payload }) => {
        if (payload.to !== myId) return;
        toast({ title: 'Removed from the call', description: 'The host removed you from this meeting.', variant: 'destructive' });
        (async () => {
          try {
            await (supabase as any)
              .from('group_call_participants')
              .update({ status: 'left', left_at: new Date().toISOString() })
              .eq('call_id', activeRef.current?.id)
              .eq('user_id', myId);
          } catch {}
          try { sendSignal('leave', { from: myId }); } catch {}
          cleanupAll();
        })();
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setChatMessages(prev => [...prev, {
          id: `${payload.from}-${payload.at}-${Math.random().toString(36).slice(2,7)}`,
          fromId: payload.from,
          fromName: payload.name || nameByUserRef.current.get(payload.from) || 'Participant',
          text: String(payload.text || ''),
          at: payload.at || Date.now(),
        }]);
        setUnreadChat(c => c + 1);
      })
      .on('broadcast', { event: 'screen' }, ({ payload }) => {
        if (payload.on) {
          setScreenSharerId(payload.from);
        } else {
          setScreenSharerId(prev => (prev === payload.from ? null : prev));
        }
      })
      .on('broadcast', { event: 'busy' }, ({ payload }) => {
        // An invitee told us they're already on another call
        const name = nameByUserRef.current.get(payload.from) || payload.name || 'A participant';
        toast({ title: `${name} is on another call`, description: 'They were not added to this call.' });
        removeParticipant(payload.from);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce arrival — repeat a few times to defeat any "I subscribed
          // a beat after you" race where existing peers miss our first hello.
          const announce = () => {
            sendSignal('join', { from: myId, name: nameByUserRef.current.get(myId) });
            const s = localStreamRef.current;
            const isMuted = !!s && s.getAudioTracks().length > 0 && s.getAudioTracks().every(t => !t.enabled);
            sendSignal('mute', { from: myId, muted: isMuted });
          };
          announce();
          setTimeout(announce, 600);
          setTimeout(announce, 1800);

          // Proactive discovery: fetch everyone the DB knows is joined to this
          // call and run the handshake directly, instead of relying purely on
          // broadcast messages (which can be missed during the subscribe race).
          try {
            const { data: rows } = await (supabase as any)
              .from('group_call_participants')
              .select('user_id, status')
              .eq('call_id', callId)
              .in('status', ['joined']);
            const others = (rows || [])
              .map((r: any) => r.user_id)
              .filter((uid: string) => uid && uid !== myId);
            if (others.length) {
              // Pull names so the tiles aren't all "Participant"
              const { data: emps } = await (supabase as any)
                .from('employees')
                .select('auth_user_id, name')
                .in('auth_user_id', others);
              (emps || []).forEach((e: any) => {
                if (e.auth_user_id && e.name) nameByUserRef.current.set(e.auth_user_id, e.name);
              });
              for (const peerId of others) {
                handlePeerJoin(peerId, nameByUserRef.current.get(peerId));
              }
            }
          } catch {}
        }
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          // Channel dropped — schedule a re-subscribe if we're still in the call.
          if (channelRetryTimerRef.current) window.clearTimeout(channelRetryTimerRef.current);
          channelRetryTimerRef.current = window.setTimeout(() => {
            channelRetryTimerRef.current = null;
            if (!activeRef.current || activeRef.current.id !== callId) return;
            try { if (channelRef.current) supabase.removeChannel(channelRef.current); } catch {}
            channelRef.current = null;
            rejoinChannelRef.current();
          }, 1500);
        }
      });
    channelRef.current = ch;
  }, [cleanupPeer, handleAnswer, handleIce, handleOffer, handlePeerJoin, myId, removeParticipant, sendSignal, toast]);

  // Keep latest rejoin closure for the channel-error retry path and
  // network/visibility recovery.
  useEffect(() => {
    rejoinChannelRef.current = () => {
      const a = activeRef.current;
      if (a) joinChannel(a.id);
    };
  }, [joinChannel]);

  // Recover from network drops or tab-suspend by re-announcing and
  // forcing a fresh handshake on any peer that isn't currently connected.
  useEffect(() => {
    if (!active) return;
    const recover = () => {
      // If channel is gone, rebuild it; otherwise just re-announce.
      if (!channelRef.current) {
        rejoinChannelRef.current();
      } else {
        sendSignal('join', { from: myId, name: nameByUserRef.current.get(myId || '') });
      }
      // Rebuild any peer that isn't in a good state.
      peersRef.current.forEach((entry, peerId) => {
        const s = entry.pc.connectionState;
        if (s !== 'connected' && s !== 'connecting') {
          reconnectPeerRef.current(peerId);
        }
      });
    };
    const onOnline = () => recover();
    const onVisible = () => { if (document.visibilityState === 'visible') recover(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, myId, sendSignal]);

  const acquireLocalStream = useCallback(async (type: GroupCallType) => {
    const constraints: MediaStreamConstraints = type === 'video'
      ? { audio: true, video: { width: { ideal: 640 }, height: { ideal: 360 } } }
      : { audio: true, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    localStreamRef.current = stream;
    return stream;
  }, []);

  const startGroupCall = useCallback<GroupCallContextValue['startGroupCall']>(async ({ type, invitees, title, conversationId }) => {
    if (!myId) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }
    if (active || incoming) {
      toast({ title: 'Already in a call', variant: 'destructive' });
      return;
    }
    const unique = Array.from(new Map(invitees.filter(i => i.userId !== myId).map(i => [i.userId, i])).values());
    if (unique.length === 0) {
      toast({ title: 'Pick at least one participant', variant: 'destructive' });
      return;
    }
    if (unique.length + 1 > GROUP_CALL_HARD_LIMIT) {
      toast({ title: `Group calls support up to ${GROUP_CALL_HARD_LIMIT} people`, variant: 'destructive' });
      return;
    }
    if (unique.length + 1 > GROUP_CALL_SOFT_LIMIT) {
      toast({ title: 'Heads up', description: `Mesh group calls work best up to ${GROUP_CALL_SOFT_LIMIT}. Expect choppy ${type}.` });
    }

    // Stash names for later
    unique.forEach(i => nameByUserRef.current.set(i.userId, i.name));
    nameByUserRef.current.set(myId, user?.user_metadata?.name || user?.email || 'You');

    // Create the group_calls row
    const { data: callRow, error: callErr } = await (supabase as any)
      .from('group_calls')
      .insert({ host_id: myId, call_type: type, title: title || null, conversation_id: conversationId || null, status: 'ringing' })
      .select()
      .single();
    if (callErr || !callRow) {
      toast({ title: 'Failed to start call', description: callErr?.message, variant: 'destructive' });
      return;
    }

    // Insert participants (host joins immediately, others ringing)
    const rows = [
      { call_id: callRow.id, user_id: myId, status: 'joined', joined_at: new Date().toISOString() },
      ...unique.map(i => ({ call_id: callRow.id, user_id: i.userId, status: 'ringing' })),
    ];
    const { error: pErr } = await (supabase as any).from('group_call_participants').insert(rows);
    if (pErr) {
      await (supabase as any).from('group_calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', callRow.id);
      toast({ title: 'Failed to invite participants', description: pErr.message, variant: 'destructive' });
      return;
    }

    try {
      await acquireLocalStream(type);
    } catch (e: any) {
      await (supabase as any).from('group_calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', callRow.id);
      toast({ title: 'Camera/mic blocked', description: e?.message, variant: 'destructive' });
      return;
    }

    setActive({ id: callRow.id, hostId: myId, type, title: title || null, conversationId: conversationId || null });
    activeRef.current = { id: callRow.id, hostId: myId, type, title: title || null, conversationId: conversationId || null };
    // Pre-fill participants in UI
    unique.forEach(i => updateParticipant(i.userId, { name: i.name, joined: false }));
    joinChannel(callRow.id);
    await (supabase as any).from('group_calls').update({ status: 'active' }).eq('id', callRow.id);
    awardMeetingLoyalty(myId, title || null, callRow.id);
  }, [active, acquireLocalStream, incoming, joinChannel, myId, toast, updateParticipant, user]);

  const acceptIncoming = useCallback(async () => {
    if (!incoming || !myId) return;
    const inc = incoming;
    setIncoming(null);
    try {
      await acquireLocalStream(inc.type);
    } catch (e: any) {
      toast({ title: 'Camera/mic blocked', description: e?.message, variant: 'destructive' });
      await (supabase as any).from('group_call_participants').update({ status: 'declined' }).eq('call_id', inc.callId).eq('user_id', myId);
      return;
    }
    nameByUserRef.current.set(myId, user?.user_metadata?.name || user?.email || 'You');
    nameByUserRef.current.set(inc.hostId, inc.hostName);
    setActive({ id: inc.callId, hostId: inc.hostId, type: inc.type, title: inc.title, conversationId: null });
    activeRef.current = { id: inc.callId, hostId: inc.hostId, type: inc.type, title: inc.title, conversationId: null };
    await (supabase as any).from('group_call_participants').update({ status: 'joined', joined_at: new Date().toISOString() }).eq('call_id', inc.callId).eq('user_id', myId);
    joinChannel(inc.callId);
    awardMeetingLoyalty(myId, inc.title, inc.callId);
  }, [acquireLocalStream, incoming, joinChannel, myId, toast, user]);

  const declineIncoming = useCallback(async () => {
    if (!incoming || !myId) return;
    const callId = incoming.callId;
    setIncoming(null);
    await (supabase as any).from('group_call_participants').update({ status: 'declined' }).eq('call_id', callId).eq('user_id', myId);
  }, [incoming, myId]);

  const dismissMissed = useCallback((callId: string) => {
    setMissedGroupCalls(prev => prev.filter(m => m.callId !== callId));
  }, []);

  const joinExistingCall = useCallback(async (callId: string, hostId: string, type: GroupCallType, title: string | null, hostName: string) => {
    if (!myId) return;
    try {
      await acquireLocalStream(type);
    } catch (e: any) {
      toast({ title: 'Camera/mic blocked', description: e?.message, variant: 'destructive' });
      return;
    }
    nameByUserRef.current.set(myId, user?.user_metadata?.name || user?.email || 'You');
    nameByUserRef.current.set(hostId, hostName);
    setActive({ id: callId, hostId, type, title, conversationId: null });
    activeRef.current = { id: callId, hostId, type, title, conversationId: null };
    await (supabase as any).from('group_call_participants').upsert(
      { call_id: callId, user_id: myId, status: 'joined', joined_at: new Date().toISOString() },
      { onConflict: 'call_id,user_id' }
    );
    joinChannel(callId);
    awardMeetingLoyalty(myId, title, callId);
  }, [acquireLocalStream, joinChannel, myId, toast, user]);

  const rejoinGroupCall = useCallback(async (callId: string) => {
    if (!myId) return;
    if (active || incoming) {
      toast({ title: 'Already in a call', variant: 'destructive' });
      return;
    }
    const { data: call } = await (supabase as any)
      .from('group_calls')
      .select('id, host_id, call_type, status, title')
      .eq('id', callId)
      .maybeSingle();
    if (!call || call.status === 'ended') {
      toast({ title: 'Call already ended' });
      dismissMissed(callId);
      return;
    }
    let hostName = 'Host';
    try {
      const { data: emp } = await (supabase as any).from('employees').select('name').eq('auth_user_id', call.host_id).maybeSingle();
      if (emp?.name) hostName = emp.name;
    } catch {}
    dismissMissed(callId);
    await joinExistingCall(call.id, call.host_id, call.call_type, call.title, hostName);
  }, [active, dismissMissed, incoming, joinExistingCall, myId, toast]);

  const leaveCall = useCallback(async () => {
    const cur = activeRef.current;
    if (!cur || !myId) return;
    try { sendSignal('leave', { from: myId }); } catch {}
    await (supabase as any).from('group_call_participants').update({ status: 'left', left_at: new Date().toISOString() }).eq('call_id', cur.id).eq('user_id', myId);
    if (cur.hostId === myId) {
      try {
        const { data } = await supabase.rpc('award_host_meeting_bonus' as any, { _call_id: cur.id });
        if ((data as any)?.success) {
          toast({ title: 'Host bonus awarded', description: 'You earned UGX 4,000 for hosting a 10+ minute meeting.' });
        }
      } catch (err) {
        console.warn('Host meeting bonus failed:', err);
      }
    } else {
      try {
        const { data } = await supabase.rpc('award_meeting_attendance_bonus' as any, { _call_id: cur.id, _interacted: interactedRef.current });
        if ((data as any)?.success) {
          const amt = (data as any).reward_given;
          toast({ title: 'Attendance bonus awarded', description: `You earned UGX ${Number(amt).toLocaleString()} for attending this meeting${interactedRef.current ? ' with active participation' : ''}.` });
        }
      } catch (err) {
        console.warn('Attendance bonus failed:', err);
      }
      // Offer rejoin if the meeting is still ongoing
      try {
        const { data: stillOn } = await (supabase as any)
          .from('group_calls')
          .select('id, host_id, call_type, title, status')
          .eq('id', cur.id)
          .maybeSingle();
        if (stillOn && stillOn.status !== 'ended') {
          const hostName = nameByUserRef.current.get(stillOn.host_id) || 'Host';
          setMissedGroupCalls(prev => prev.some(m => m.callId === stillOn.id) ? prev : [
            ...prev,
            { callId: stillOn.id, hostId: stillOn.host_id, hostName, type: stillOn.call_type, title: stillOn.title, at: Date.now() },
          ]);
        }
      } catch {}
    }
    cleanupAll();
  }, [cleanupAll, myId, sendSignal, toast]);

  const endForAll = useCallback(async () => {
    const cur = activeRef.current;
    if (!cur || !myId) return;
    try { sendSignal('leave', { from: myId }); } catch {}
    if (cur.hostId === myId) {
      await (supabase as any).from('group_calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', cur.id);
      try {
        const { data } = await supabase.rpc('award_host_meeting_bonus' as any, { _call_id: cur.id });
        if ((data as any)?.success) {
          toast({ title: 'Host bonus awarded', description: 'You earned UGX 4,000 for hosting a 10+ minute meeting.' });
        }
      } catch (err) {
        console.warn('Host meeting bonus failed:', err);
      }
      // Auto-award all qualifying attendees so they don't have to leave manually
      try {
        const { data: bulk } = await supabase.rpc('award_all_meeting_attendance_bonuses' as any, { _call_id: cur.id });
        const n = Number((bulk as any)?.awarded || 0);
        if (n > 0) {
          toast({ title: 'Attendance bonuses sent', description: `${n} participant${n === 1 ? '' : 's'} awarded for this meeting.` });
        }
      } catch (err) {
        console.warn('Bulk attendance award failed:', err);
      }
    } else {
      await (supabase as any).from('group_call_participants').update({ status: 'left', left_at: new Date().toISOString() }).eq('call_id', cur.id).eq('user_id', myId);
      try {
        const { data } = await supabase.rpc('award_meeting_attendance_bonus' as any, { _call_id: cur.id, _interacted: interactedRef.current });
        if ((data as any)?.success) {
          const amt = (data as any).reward_given;
          toast({ title: 'Attendance bonus awarded', description: `You earned UGX ${Number(amt).toLocaleString()} for attending this meeting${interactedRef.current ? ' with active participation' : ''}.` });
        }
      } catch (err) {
        console.warn('Attendance bonus failed:', err);
      }
    }
    cleanupAll();
  }, [cleanupAll, myId, sendSignal, toast]);

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    const enabled = s.getAudioTracks().some(t => t.enabled);
    s.getAudioTracks().forEach(t => (t.enabled = !enabled));
    setMuted(enabled);
    interactedRef.current = true;
    if (myId) sendSignal('mute', { from: myId, muted: enabled });
  }, [myId, sendSignal]);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    const enabled = s.getVideoTracks().some(t => t.enabled);
    s.getVideoTracks().forEach(t => (t.enabled = !enabled));
    setCameraOff(enabled);
  }, []);

  const toggleHand = useCallback(() => {
    if (!myId) return;
    setHandsRaised(prev => {
      const next = new Set(prev);
      const raised = !next.has(myId);
      if (raised) next.add(myId); else next.delete(myId);
      sendSignal('hand', { from: myId, raised });
      return next;
    });
    interactedRef.current = true;
  }, [myId, sendSignal]);

  const sendChat = useCallback((text: string) => {
    if (!myId || !text.trim()) return;
    const at = Date.now();
    const name = nameByUserRef.current.get(myId) || 'You';
    sendSignal('chat', { from: myId, name, text: text.trim(), at });
    interactedRef.current = true;
    setChatMessages(prev => [...prev, {
      id: `${myId}-${at}`,
      fromId: myId,
      fromName: name,
      text: text.trim(),
      at,
    }]);
  }, [myId, sendSignal]);

  const markChatRead = useCallback(() => setUnreadChat(0), []);

  const forceMuteParticipant = useCallback((userId: string) => {
    const cur = activeRef.current;
    if (!cur || !myId || cur.hostId !== myId || userId === myId) return;
    sendSignal('force_mute', { from: myId, to: userId });
    setMutedPeers(prev => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    const name = nameByUserRef.current.get(userId) || 'Participant';
    toast({ title: `Muted ${name}` });
  }, [myId, sendSignal, toast]);

  const removeParticipantFromCall = useCallback(async (userId: string) => {
    const cur = activeRef.current;
    if (!cur || !myId || cur.hostId !== myId || userId === myId) return;
    sendSignal('kick', { from: myId, to: userId });
    try {
      await (supabase as any)
        .from('group_call_participants')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .eq('call_id', cur.id)
        .eq('user_id', userId);
    } catch {}
    cleanupPeer(userId);
    removeParticipant(userId);
    const name = nameByUserRef.current.get(userId) || 'Participant';
    toast({ title: `Removed ${name} from the call` });
  }, [cleanupPeer, myId, removeParticipant, sendSignal, toast]);

  const replaceVideoTrackOnPeers = useCallback((track: MediaStreamTrack | null) => {
    peersRef.current.forEach(entry => {
      const sender = entry.pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        try { sender.replaceTrack(track); } catch {}
      } else if (track) {
        try { entry.pc.addTrack(track); } catch {}
      }
    });
  }, []);

  const stopScreenShare = useCallback(() => {
    const s = localStreamRef.current;
    const cam = cameraTrackRef.current;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    if (s && cam) {
      // Swap screen track back to camera in local stream
      s.getVideoTracks().forEach(t => { try { s.removeTrack(t); } catch {} });
      s.addTrack(cam);
      setLocalStream(new MediaStream(s.getTracks()));
      replaceVideoTrackOnPeers(cam);
    } else {
      replaceVideoTrackOnPeers(null);
    }
    cameraTrackRef.current = null;
    setIsScreenSharing(false);
    if (myId) sendSignal('screen', { from: myId, on: false });
    setScreenSharerId(prev => (prev === myId ? null : prev));
  }, [myId, replaceVideoTrackOnPeers, sendSignal]);

  const toggleScreenShare = useCallback(async () => {
    if (!activeRef.current || !myId) return;
    if (isScreenSharing) { stopScreenShare(); return; }
    if (screenSharerId && screenSharerId !== myId) {
      toast({ title: 'Someone else is sharing', description: 'Ask them to stop first.', variant: 'destructive' });
      return;
    }
    try {
      const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
      const screenTrack: MediaStreamTrack = display.getVideoTracks()[0];
      screenStreamRef.current = display;
      const s = localStreamRef.current;
      if (s) {
        const currentVideo = s.getVideoTracks()[0] || null;
        cameraTrackRef.current = currentVideo;
        if (currentVideo) { try { s.removeTrack(currentVideo); } catch {} }
        s.addTrack(screenTrack);
        setLocalStream(new MediaStream(s.getTracks()));
      }
      replaceVideoTrackOnPeers(screenTrack);
      screenTrack.onended = () => stopScreenShare();
      setIsScreenSharing(true);
      setScreenSharerId(myId);
      sendSignal('screen', { from: myId, on: true });
    } catch (e: any) {
      toast({ title: 'Screen share failed', description: e?.message, variant: 'destructive' });
    }
  }, [isScreenSharing, myId, replaceVideoTrackOnPeers, screenSharerId, sendSignal, stopScreenShare, toast]);

  const addParticipants = useCallback<GroupCallContextValue['addParticipants']>(async (invitees) => {
    const cur = activeRef.current;
    if (!cur) return;
    const unique = Array.from(new Map(invitees.filter(i => i.userId && i.userId !== myId).map(i => [i.userId, i])).values());
    if (unique.length === 0) return;
    const currentCount = participants.size + 1;
    if (currentCount + unique.length > GROUP_CALL_HARD_LIMIT) {
      toast({ title: `Max ${GROUP_CALL_HARD_LIMIT} people per call`, variant: 'destructive' });
      return;
    }
    unique.forEach(i => nameByUserRef.current.set(i.userId, i.name));
    const rows = unique.map(i => ({ call_id: cur.id, user_id: i.userId, status: 'ringing', joined_at: null, left_at: null }));
    // Upsert so re-inviting someone who previously declined/missed/left doesn't violate the (call_id,user_id) unique constraint
    // Retry on transient upstream/network errors (e.g. PostgREST cold-start "upstream connect error … connection timeout")
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await (supabase as any)
        .from('group_call_participants')
        .upsert(rows, { onConflict: 'call_id,user_id' });
      if (!error) { lastError = null; break; }
      lastError = error;
      const msg = String(error?.message || '').toLowerCase();
      const transient = msg.includes('upstream') || msg.includes('timeout') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('disconnect');
      if (!transient) break;
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
    if (lastError) {
      toast({ title: 'Failed to invite', description: 'Network hiccup, please try again in a moment.', variant: 'destructive' });
      return;
    }
    unique.forEach(i => updateParticipant(i.userId, { name: i.name, joined: false }));
    toast({ title: `Invited ${unique.length} more` });
  }, [myId, participants, toast, updateParticipant]);

  // Incoming detection
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`incoming-group-calls:${myId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_call_participants', filter: `user_id=eq.${myId}` },
        async (payload) => {
          const row: any = payload.new;
          if (row.status !== 'ringing') return;
          const { data: call } = await (supabase as any)
            .from('group_calls')
            .select('id, host_id, call_type, status, title')
            .eq('id', row.call_id)
            .maybeSingle();
          if (!call || (call.status !== 'ringing' && call.status !== 'active')) return;
          // Look up host name
          let hostName = 'Someone';
          try {
            const { data: emp } = await (supabase as any)
              .from('employees')
              .select('name')
              .eq('auth_user_id', call.host_id)
              .maybeSingle();
            if (emp?.name) hostName = emp.name;
          } catch {}
          // If user is already busy → file it under missed so they can rejoin later
          if (activeRef.current || incoming) {
            // Tell the host we're busy so their UI can show "X is on another call"
            try {
              const busyCh = supabase.channel(`group-call:${call.id}`, { config: { broadcast: { self: false } } });
              const myName = user?.user_metadata?.name || user?.email || 'A participant';
              await new Promise<void>((resolve) => {
                let done = false;
                busyCh.subscribe((status) => {
                  if (status === 'SUBSCRIBED' && !done) { done = true; resolve(); }
                });
                setTimeout(() => { if (!done) { done = true; resolve(); } }, 1500);
              });
              await busyCh.send({ type: 'broadcast', event: 'busy', payload: { from: myId, name: myName } });
              setTimeout(() => { try { supabase.removeChannel(busyCh); } catch {} }, 800);
            } catch {}
            try {
              await (supabase as any).from('group_call_participants')
                .update({ status: 'missed' })
                .eq('call_id', call.id).eq('user_id', myId);
            } catch {}
            setMissedGroupCalls(prev => prev.some(m => m.callId === call.id) ? prev : [
              ...prev,
              { callId: call.id, hostId: call.host_id, hostName, type: call.call_type, title: call.title, at: Date.now() },
            ]);
            return;
          }
          setIncoming({
            callId: call.id,
            hostId: call.host_id,
            hostName,
            type: call.call_type,
            title: call.title,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [incoming, myId]);

  // Seed missed calls on mount + when login changes: find ongoing calls where I never joined
  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await (supabase as any)
        .from('group_call_participants')
        .select('call_id, status, group_calls!inner(id, host_id, call_type, status, title, started_at)')
        .eq('user_id', myId)
        .in('status', ['ringing', 'missed', 'declined'])
        .in('group_calls.status', ['ringing', 'active']);
      if (cancelled || !rows) return;
      const hostIds = Array.from(new Set(rows.map((r: any) => r.group_calls?.host_id).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (hostIds.length) {
        const { data: emps } = await (supabase as any).from('employees').select('auth_user_id, name').in('auth_user_id', hostIds);
        (emps || []).forEach((e: any) => { if (e.auth_user_id) nameMap.set(e.auth_user_id, e.name); });
      }
      const missed: MissedGroupCall[] = rows.map((r: any) => ({
        callId: r.group_calls.id,
        hostId: r.group_calls.host_id,
        hostName: nameMap.get(r.group_calls.host_id) || 'Host',
        type: r.group_calls.call_type,
        title: r.group_calls.title,
        at: r.group_calls.started_at ? new Date(r.group_calls.started_at).getTime() : Date.now(),
      }));
      setMissedGroupCalls(missed);
    })();
    return () => { cancelled = true; };
  }, [myId]);

  // Drop missed entries when their call ends
  useEffect(() => {
    if (missedGroupCalls.length === 0) return;
    const ch = supabase
      .channel(`missed-group-calls:${myId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_calls' }, (payload) => {
        const row: any = payload.new;
        if (row?.status === 'ended') {
          setMissedGroupCalls(prev => prev.filter(m => m.callId !== row.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [missedGroupCalls.length, myId]);

  // Watch active call row to detect end-for-all
  useEffect(() => {
    if (!active) return;
    const ch = supabase
      .channel(`gc-watch:${active.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_calls', filter: `id=eq.${active.id}` },
        (payload) => {
          const row: any = payload.new;
          if (row.status === 'ended') {
            toast({ title: 'Call ended' });
            cleanupAll();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, cleanupAll, toast]);

  return (
    <GroupCallContext.Provider value={{
      active, participants, incoming, muted, cameraOff, localStream,
      handsRaised, myHandRaised: myId ? handsRaised.has(myId) : false,
      mutedPeers,
      chatMessages, unreadChat, markChatRead,
      isScreenSharing, screenSharerId,
      startGroupCall, acceptIncoming, declineIncoming, leaveCall, endForAll, toggleMute, toggleCamera,
      toggleHand, sendChat, toggleScreenShare, addParticipants,
      missedGroupCalls, rejoinGroupCall, dismissMissed,
      forceMuteParticipant, removeParticipantFromCall,
    }}>
      {children}
    </GroupCallContext.Provider>
  );
};