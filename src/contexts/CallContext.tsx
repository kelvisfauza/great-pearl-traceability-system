import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, PhoneIncoming } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CallType = 'audio' | 'video';
type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed';

interface CallRow {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
}

interface PeerInfo {
  name: string;
  avatarInitials: string;
}

interface CallContextValue {
  startCall: (calleeAuthId: string, calleeName: string, type: CallType) => Promise<void>;
  inCall: boolean;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free public TURN relays (Open Relay Project) — required so audio/
    // video actually flow when peers are behind NAT, mobile data, or
    // corporate firewalls where STUN alone is not enough.
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 4,
};

// Classic dual-tone phone ringtone (440Hz + 480Hz, 2s on / 4s off cadence)
function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);

  const stop = useCallback(() => {
    timeoutsRef.current.forEach(id => window.clearTimeout(id));
    timeoutsRef.current = [];
    nodesRef.current.forEach(({ osc, gain }) => {
      try { gain.gain.cancelScheduledValues(0); gain.gain.value = 0; } catch {}
      try { osc.stop(); } catch {}
      try { osc.disconnect(); gain.disconnect(); } catch {}
    });
    nodesRef.current = [];
    if (ctxRef.current) {
      try { ctxRef.current.close(); } catch {}
      ctxRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      ctxRef.current = ctx;

      // One "ring" = two tones (440 + 480Hz) played together for ~2s,
      // with a soft attack/release envelope, then 4s of silence.
      const playRing = () => {
        if (!ctxRef.current) return;
        const now = ctx.currentTime;
        const duration = 2.0;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.18, now + 0.05);
        master.gain.setValueAtTime(0.18, now + duration - 0.1);
        master.gain.linearRampToValueAtTime(0, now + duration);
        master.connect(ctx.destination);

        [440, 480].forEach(freq => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const gain = ctx.createGain();
          gain.gain.value = 0.5;
          osc.connect(gain).connect(master);
          osc.start(now);
          osc.stop(now + duration + 0.05);
          nodesRef.current.push({ osc, gain });
        });
      };

      const loop = () => {
        playRing();
        const id = window.setTimeout(loop, 6000); // 2s ring + 4s pause
        timeoutsRef.current.push(id);
      };
      loop();
    } catch (e) {
      console.warn('Ringtone failed', e);
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);
  return { start, stop };
}

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const myId = user?.id || null;

  // Incoming (ringing) call awaiting accept/decline
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [incomingPeer, setIncomingPeer] = useState<PeerInfo | null>(null);

  // Active call
  const [active, setActive] = useState<CallRow | null>(null);
  const [activePeer, setActivePeer] = useState<PeerInfo | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  // Loud "unavailable" banner shown when the callee doesn't pick up
  // within the ring timeout window.
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  // Use a hidden <video> element as the audio sink. On iOS Safari and
  // many Android browsers, audio attached to <audio> is routed to the
  // earpiece; routing the same MediaStream through a <video> element
  // forces playback through the loudspeaker.
  const remoteAudioRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteSetRef = useRef(false);
  const readyRetryRef = useRef<number | null>(null);
  const callerSubscribedRef = useRef(false);

  const ringtone = useRingtone();
  // Caller-side ringback tone (so the caller hears "ring ring" while waiting)
  const ringback = useRingtone();

  // Log a call event as a message in the direct conversation between
  // the current user and the peer so missed/declined/ended calls show
  // up inline in the chat (like WhatsApp).
  const logCallToChat = useCallback(async (
    peerAuthId: string,
    callType: CallType,
    outcome: 'missed' | 'declined' | 'ended' | 'outgoing',
    durationSec?: number,
  ) => {
    if (!myId) return;
    try {
      // Find existing direct conversation between the two users
      const { data: mine } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', myId);
      const { data: theirs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', peerAuthId);
      const mineIds = new Set((mine || []).map((r: any) => r.conversation_id));
      let convId = (theirs || []).find((r: any) => mineIds.has(r.conversation_id))?.conversation_id;

      if (!convId) {
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .insert({ type: 'direct', created_by: myId })
          .select()
          .single();
        if (convErr || !conv) return;
        convId = conv.id;
        await supabase.from('conversation_participants').insert([
          { conversation_id: convId, user_id: myId },
          { conversation_id: convId, user_id: peerAuthId },
        ]);
      }

      const label =
        outcome === 'missed'   ? `📞 Missed ${callType} call`
      : outcome === 'declined' ? `📞 ${callType === 'video' ? 'Video' : 'Voice'} call declined`
      : outcome === 'ended'    ? `📞 ${callType === 'video' ? 'Video' : 'Voice'} call${durationSec ? ` · ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}` : ''}`
      :                          `📞 ${callType === 'video' ? 'Video' : 'Voice'} call`;

      await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: myId,
        sender_name: 'Call',
        content: label,
        type: 'text',
      });
    } catch (e) {
      console.warn('[call] log to chat failed', e);
    }
  }, [myId]);

  // Track when the active call was answered so we can report duration
  const answeredAtRef = useRef<number | null>(null);
  // Set to true when the caller has abandoned (timed out). Used to
  // ignore any late "answer/track" signals that might otherwise flip
  // the call back to active after we've already declared it unavailable.
  const abandonedRef = useRef(false);

  // Request OS-level notification permission once (so we can pop up
  // an incoming-call notification even when the tab is in the background).
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch {}
    }
  }, []);

  const cleanup = useCallback(() => {
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Safety: always stop the ringtone on any cleanup
    try { ringtone.stop(); } catch {}
    try { ringback.stop(); } catch {}
    pendingIceRef.current = [];
    remoteSetRef.current = false;
    callerSubscribedRef.current = false;
    if (readyRetryRef.current) {
      window.clearInterval(readyRetryRef.current);
      readyRetryRef.current = null;
    }
    setActive(null);
    setActivePeer(null);
    setIsInitiator(false);
    setMuted(false);
    setCameraOff(false);
    setRemoteHasVideo(false);
    answeredAtRef.current = null;
    abandonedRef.current = false;
    remoteStreamRef.current = null;
    setRemoteStreamVersion(v => v + 1);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, [ringtone, ringback]);

  const sendSignal = useCallback((event: string, payload: any) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  // Fetch peer info (name) by auth_user_id
  const fetchPeer = useCallback(async (authUserId: string): Promise<PeerInfo> => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('name')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      const name = data?.name || 'Unknown user';
      const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
      return { name, avatarInitials: initials };
    } catch {
      return { name: 'Unknown user', avatarInitials: 'U' };
    }
  }, []);

  // Build PC, attach local stream, set up signaling channel
  const setupPeer = useCallback(async (callId: string, type: CallType): Promise<MediaStream | null> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
    } catch (err: any) {
      toast({
        title: 'Microphone/Camera access denied',
        description: err?.message || 'Please allow access and try again.',
        variant: 'destructive',
      });
      return null;
    }
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (ev) => {
      const [remote] = ev.streams;
      // Caller already gave up — ignore any late media arrival.
      if (abandonedRef.current) return;
      // Remote media is flowing — stop the caller-side ringback.
      try { ringback.stop(); } catch {}
      // Save the remote stream; an effect attaches it to the audio/
      // video elements once they mount (the dialog may not be in the
      // DOM yet when ontrack fires).
      remoteStreamRef.current = remote;
      // Track-level listener so we flip "has video" as soon as the
      // remote video track is actually live (video tracks often arrive
      // after the first ontrack fires with only audio).
      const recompute = () => setRemoteHasVideo(remote.getVideoTracks().length > 0);
      recompute();
      remote.onaddtrack = recompute;
      remote.onremovetrack = recompute;
      setRemoteStreamVersion(v => v + 1);
      // Real connection signal: remote media is actually flowing.
      // Use this (not the 'ready' broadcast) to start the call timer.
      if (!answeredAtRef.current) {
        answeredAtRef.current = Date.now();
        setActive(prev => prev ? { ...prev, status: 'active' } as CallRow : prev);
      }
      console.log('[call] remote track received', {
        audio: remote.getAudioTracks().length,
        video: remote.getVideoTracks().length,
      });
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendSignal('ice', { candidate: ev.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[call] connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        toast({
          title: 'Call connection failed',
          description: 'Could not establish media. Check your network and try again.',
          variant: 'destructive',
        });
      }
    };
    pc.oniceconnectionstatechange = () => {
      console.log('[call] ice state:', pc.iceConnectionState);
    };

    return stream;
  }, [sendSignal, toast]);

  // Join the per-call broadcast channel
  const joinChannel = useCallback((callId: string, onReady?: () => void) => {
    const ch = supabase.channel(`call:${callId}`, { config: { broadcast: { self: false } } });

    ch.on('broadcast', { event: 'ready' }, async () => {
      // Callee signals they're ready; caller creates offer
      const pc = pcRef.current;
      if (!pc) return;
      // If we've already created/sent an offer, ignore duplicate readys
      if (pc.localDescription) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('offer', { sdp: offer });
      } catch (e) { console.error('[call] offer error', e); }
    });

    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      const pc = pcRef.current;
      if (!pc) return;
      // Offer arrived — stop the ready-retry loop on the callee side
      if (readyRetryRef.current) {
        window.clearInterval(readyRetryRef.current);
        readyRetryRef.current = null;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        remoteSetRef.current = true;
        for (const c of pendingIceRef.current) {
          try { await pc.addIceCandidate(c); } catch {}
        }
        pendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal('answer', { sdp: answer });
      } catch (e) { console.error('[call] answer error', e); }
    });

    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        remoteSetRef.current = true;
        for (const c of pendingIceRef.current) {
          try { await pc.addIceCandidate(c); } catch {}
        }
        pendingIceRef.current = [];
      } catch (e) { console.error('[call] setRemote answer error', e); }
    });

    ch.on('broadcast', { event: 'ice' }, async ({ payload }) => {
      const pc = pcRef.current;
      if (!pc) return;
      const cand = payload.candidate as RTCIceCandidateInit;
      if (!remoteSetRef.current) {
        pendingIceRef.current.push(cand);
        return;
      }
      try { await pc.addIceCandidate(cand); } catch (e) { console.warn('[call] ice add error', e); }
    });

    ch.on('broadcast', { event: 'hangup' }, () => {
      toast({ title: 'Call ended', description: 'The other party hung up.' });
      cleanup();
    });

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        callerSubscribedRef.current = true;
        if (onReady) onReady();
      }
    });

    channelRef.current = ch;
  }, [cleanup, sendSignal, toast]);

  // Outgoing call
  const startCall = useCallback(async (calleeAuthId: string, calleeName: string, type: CallType) => {
    if (!myId) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }
    if (active || incoming) {
      toast({ title: 'Already in a call', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase
      .from('call_sessions')
      .insert({ caller_id: myId, callee_id: calleeAuthId, call_type: type, status: 'ringing' })
      .select()
      .single();
    if (error || !data) {
      toast({ title: 'Failed to start call', description: error?.message, variant: 'destructive' });
      return;
    }
    const row = data as CallRow;
    const initials = calleeName.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
    setActive(row);
    setActivePeer({ name: calleeName, avatarInitials: initials });
    setIsInitiator(true);

    const stream = await setupPeer(row.id, type);
    if (!stream) {
      // Mark as ended
      await supabase.from('call_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', row.id);
      cleanup();
      return;
    }
    joinChannel(row.id);

    // Start caller-side ringback so the caller hears "ring ring" while waiting.
    try { ringback.start(); } catch {}

    // Ringback / timeout
    setTimeout(async () => {
      // If we never got remote media, treat this as unanswered — no
      // matter what the DB row currently says. This prevents the call
      // from "ringing forever" or auto-picking up at the last second.
      if (answeredAtRef.current) return;
      if (!pcRef.current) return;

      // Mark abandoned FIRST so any in-flight ontrack/ready signals
      // arriving in the next few ms are ignored.
      abandonedRef.current = true;
      // Stop the ringback immediately so the caller doesn't keep
      // hearing "ring ring" while the unavailable banner shows.
      try { ringback.stop(); } catch {}

      try {
        await supabase
          .from('call_sessions')
          .update({ status: 'missed', ended_at: new Date().toISOString() })
          .eq('id', row.id);
      } catch {}
      try { sendSignal('hangup', {}); } catch {}
      logCallToChat(calleeAuthId, type, 'missed');
      cleanup();

      // Loud, prominent unavailable banner + spoken announcement
      const message = `${calleeName} is currently unavailable, please try again later.`;
      setUnavailable(message);
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(message);
          u.volume = 1; u.rate = 1; u.pitch = 1;
          window.speechSynthesis.speak(u);
        }
      } catch {}
      window.setTimeout(() => setUnavailable(null), 6000);
    }, 10000);
  }, [myId, active, incoming, toast, setupPeer, joinChannel, cleanup, sendSignal, logCallToChat]);

  // Incoming call detection
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`incoming-calls:${myId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_sessions', filter: `callee_id=eq.${myId}` },
        async (payload) => {
          const row = payload.new as CallRow;
          if (row.status !== 'ringing') return;
          if (active || incoming) {
            // Auto-decline if already busy
            await supabase.from('call_sessions').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', row.id);
            return;
          }
          const peer = await fetchPeer(row.caller_id);
          setIncoming(row);
          setIncomingPeer(peer);
          ringtone.start();

          // Surface an OS-level notification when the user isn't actively
          // looking at the tab, and try to bring the window to focus.
          try {
            if (typeof document !== 'undefined' && document.hidden &&
                'Notification' in window && Notification.permission === 'granted') {
              const n = new Notification(`Incoming ${row.call_type} call`, {
                body: `${peer.name} is calling you`,
                icon: '/favicon.ico',
                tag: `call-${row.id}`,
                requireInteraction: true,
              });
              n.onclick = () => {
                try { window.focus(); } catch {}
                n.close();
              };
            }
          } catch (e) { console.warn('[call] notification failed', e); }
          try { window.focus(); } catch {}
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, active, incoming, fetchPeer, ringtone]);

  // Watch active call for remote-side changes
  useEffect(() => {
    if (!active) return;
    const ch = supabase
      .channel(`call-watch:${active.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `id=eq.${active.id}` },
        (payload) => {
          const row = payload.new as CallRow;
          if (row.status === 'active' && !answeredAtRef.current && !abandonedRef.current) {
            answeredAtRef.current = Date.now();
            // Reflect the answered state locally so the caller's UI
            // stops showing "Ringing…" and switches to "Connected".
            setActive(row);
          }
          if (row.status === 'declined' || row.status === 'ended' || row.status === 'missed') {
            toast({ title: row.status === 'declined' ? 'Call declined' : 'Call ended' });
            sendSignal('hangup', {});
            // Caller logs the outcome so it appears once in the shared chat
            if (isInitiator && active) {
              const peerId = active.caller_id === myId ? active.callee_id : active.caller_id;
              const dur = answeredAtRef.current ? Math.floor((Date.now() - answeredAtRef.current) / 1000) : undefined;
              const outcome: 'declined' | 'missed' | 'ended' =
                row.status === 'declined' ? 'declined'
              : row.status === 'missed'   ? 'missed'
              : 'ended';
              logCallToChat(peerId, active.call_type, outcome, dur);
            }
            cleanup();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, cleanup, sendSignal, toast, isInitiator, myId, logCallToChat]);

  // Watch the incoming (ringing) call so the ringtone stops if the
  // caller hangs up / cancels / times out before the callee answers.
  useEffect(() => {
    if (!incoming) return;
    const ch = supabase
      .channel(`incoming-watch:${incoming.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `id=eq.${incoming.id}` },
        (payload) => {
          const row = payload.new as CallRow;
          if (row.status !== 'ringing') {
            ringtone.stop();
            setIncoming(null);
            setIncomingPeer(null);
            if (row.status === 'missed') {
              toast({ title: 'Missed call', description: `${incomingPeer?.name || 'Caller'} tried to reach you.` });
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [incoming, incomingPeer, ringtone, toast]);

  const acceptIncoming = useCallback(async () => {
    if (!incoming || !incomingPeer) return;
    ringtone.stop();
    const row = incoming;
    const peer = incomingPeer;
    setActive(row);
    setActivePeer(peer);
    setIsInitiator(false);
    setIncoming(null);
    setIncomingPeer(null);

    const stream = await setupPeer(row.id, row.call_type);
    if (!stream) {
      await supabase.from('call_sessions').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', row.id);
      cleanup();
      return;
    }
    await supabase.from('call_sessions').update({ status: 'active', answered_at: new Date().toISOString() }).eq('id', row.id);
    answeredAtRef.current = Date.now();
    joinChannel(row.id, () => {
      // Tell caller we're ready so they create the offer. The caller's
      // channel may not have finished subscribing yet, so retry until
      // we receive the offer (remoteSetRef flips true) or give up.
      sendSignal('ready', {});
      let attempts = 0;
      readyRetryRef.current = window.setInterval(() => {
        attempts += 1;
        if (remoteSetRef.current || attempts > 20) {
          if (readyRetryRef.current) {
            window.clearInterval(readyRetryRef.current);
            readyRetryRef.current = null;
          }
          return;
        }
        sendSignal('ready', {});
      }, 600);
    });
  }, [incoming, incomingPeer, ringtone, setupPeer, joinChannel, sendSignal, cleanup]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    ringtone.stop();
    const row = incoming;
    await supabase
      .from('call_sessions')
      .update({ status: 'declined', ended_at: new Date().toISOString() })
      .eq('id', row.id);
    setIncoming(null);
    setIncomingPeer(null);
  }, [incoming, ringtone]);

  const hangup = useCallback(async () => {
    if (!active) return;
    const id = active.id;
    const peerId = active.caller_id === myId ? active.callee_id : active.caller_id;
    const dur = answeredAtRef.current ? Math.floor((Date.now() - answeredAtRef.current) / 1000) : undefined;
    const wasInitiator = isInitiator;
    const callType = active.call_type;
    sendSignal('hangup', {});
    await supabase.from('call_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', id);
    if (wasInitiator) {
      logCallToChat(peerId, callType, 'ended', dur);
    }
    cleanup();
  }, [active, cleanup, sendSignal, myId, isInitiator, logCallToChat]);

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(prev => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCameraOff(prev => !prev);
  }, []);

  const value = useMemo<CallContextValue>(() => ({
    startCall,
    inCall: !!active || !!incoming,
  }), [startCall, active, incoming]);

  const isVideo = active?.call_type === 'video';

  // Attach the remote stream to the audio/video sinks whenever either
  // the stream or the elements become available (Radix dialogs mount
  // their content lazily, so refs may be null when ontrack fires).
  useEffect(() => {
    const stream = remoteStreamRef.current;
    if (!stream) return;
    if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== stream) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.volume = 1.0;
      try { (remoteAudioRef.current as any).setSinkId?.('default'); } catch {}
      remoteAudioRef.current.play().catch(err => console.warn('[call] audio play blocked', err));
    }
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStreamVersion, active, remoteHasVideo]);

  // Tick once a second to refresh the call duration display
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const formatDuration = (startMs: number | null) => {
    if (!startMs) return null;
    const total = Math.floor((Date.now() - startMs) / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <CallContext.Provider value={value}>
      {children}

      {/* Incoming call dialog */}
      <Dialog open={!!incoming} onOpenChange={(o) => { if (!o) declineIncoming(); }}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex flex-col items-center gap-4 py-4">
            <PhoneIncoming className="h-8 w-8 text-primary animate-pulse" />
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {incomingPeer?.avatarInitials || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-lg font-semibold">{incomingPeer?.name || 'Incoming call'}</p>
              <p className="text-sm text-muted-foreground capitalize">
                Incoming {incoming?.call_type} call…
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="destructive" onClick={declineIncoming} className="rounded-full h-14 w-14 p-0">
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button onClick={acceptIncoming} className="rounded-full h-14 w-14 p-0 bg-green-600 hover:bg-green-700">
                <Phone className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active call dialog */}
      <Dialog open={!!active} onOpenChange={() => { /* prevent close via overlay */ }}>
        <DialogContent
          className="sm:max-w-3xl p-0 overflow-hidden bg-black text-white border-0"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="relative w-full aspect-video bg-neutral-900">
            {/* Hidden audio sink — always plays the remote stream so audio
                works even when the video element is hidden (audio-only).
                Using <video> instead of <audio> forces loudspeaker output
                on iOS/Android instead of the earpiece. */}
            <video
              ref={remoteAudioRef}
              autoPlay
              playsInline
              // muted attribute would silence it; we want it audible.
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
            />

            {/* Remote video / audio-only fallback */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${isVideo && remoteHasVideo ? '' : 'hidden'}`}
            />
            {!(isVideo && remoteHasVideo) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary-foreground">
                    {activePeer?.avatarInitials || 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-lg font-semibold">{activePeer?.name}</p>
                <p className="text-sm text-white/70">
                  {isInitiator && active?.status === 'ringing'
                    ? 'Ringing…'
                    : (formatDuration(answeredAtRef.current) || 'Connecting…')}
                </p>
              </div>
            )}

            {/* Local PIP */}
            {isVideo && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded-md border border-white/20 bg-black"
              />
            )}

            {/* Header */}
            <div className="absolute top-3 left-4 right-4 flex justify-between items-center text-sm">
              <span className="font-medium">{activePeer?.name}</span>
              <span className="flex items-center gap-2 text-xs opacity-80">
                {answeredAtRef.current && (
                  <span className="font-mono tabular-nums">{formatDuration(answeredAtRef.current)}</span>
                )}
                <span className="uppercase tracking-wide opacity-70">{active?.call_type}</span>
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 p-4 bg-neutral-950">
            <Button
              variant={muted ? 'destructive' : 'secondary'}
              onClick={toggleMute}
              className="rounded-full h-12 w-12 p-0"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            {isVideo && (
              <Button
                variant={cameraOff ? 'destructive' : 'secondary'}
                onClick={toggleCamera}
                className="rounded-full h-12 w-12 p-0"
                aria-label={cameraOff ? 'Camera on' : 'Camera off'}
              >
                {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={hangup}
              className="rounded-full h-12 w-12 p-0"
              aria-label="Hang up"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unavailable banner — shown when ringing times out */}
      <Dialog open={!!unavailable} onOpenChange={(o) => { if (!o) setUnavailable(null); }}>
        <DialogContent className="sm:max-w-md border-destructive">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <PhoneOff className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-xl font-bold text-destructive">
              {unavailable}
            </p>
            <Button onClick={() => setUnavailable(null)} className="mt-2">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};