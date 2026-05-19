## Goal

Add a Teams-style internal communication module to the system: 1:1 chat plus 1:1 voice/video calls between logged-in employees, using Supabase Realtime for signaling/messaging and WebRTC for peer-to-peer audio/video.

## Scope (Phase 1)

In scope:
- 1:1 text chat between any two employees (persistent history)
- Online presence (reuse existing `user_presence`)
- 1:1 voice and video calls over WebRTC, with ringing UI, accept/decline, mute, camera toggle, hang up
- Call log (who called whom, duration, status)
- Unread message badges
- A dedicated "Communication" page + a floating call/incoming-call dialog available anywhere in the app

Out of scope (later phases):
- Group calls (3+ participants) — needs an SFU like LiveKit
- Call recording
- Screen sharing (easy to add later)
- PSTN / phone dial-out
- File attachments inside chat (current generic messaging covers this; we can extend later)

## Architecture

```text
 ┌───────────────┐   Realtime (postgres_changes + broadcast)   ┌───────────────┐
 │  User A (web) │ ◄────────────── Supabase ─────────────────► │  User B (web) │
 │  WebRTC peer  │                                              │  WebRTC peer  │
 │      ▲        │ ───── direct P2P media (audio/video) ─────► │      ▲        │
 └──────┴────────┘                                              └──────┴───────┘
```

- Signaling: a Supabase Realtime broadcast channel per call (`call:{callId}`) carries SDP offer/answer + ICE candidates.
- Chat: standard Postgres table + `postgres_changes` subscription.
- Presence: existing `user_presence` table.
- STUN: free Google STUN servers (`stun:stun.l.google.com:19302`). No TURN needed for most office networks; we can add later if cross-NAT calls fail.

## Database (new tables)

1. `conversations` — one row per 1:1 pair (`user_a_id`, `user_b_id`, ordered so the pair is unique).
2. `chat_messages` — `conversation_id`, `sender_id`, `body`, `created_at`, `read_at`.
3. `call_sessions` — `id`, `caller_id`, `callee_id`, `type` ('audio'|'video'), `status` ('ringing'|'active'|'ended'|'declined'|'missed'), `started_at`, `answered_at`, `ended_at`.

RLS: users can only read/write rows where they are a participant. Standard policies using `auth.uid()`.

## Frontend

New files:
- `src/hooks/useConversations.ts` — list of conversations + unread counts
- `src/hooks/useChat.ts` — messages for one conversation, send, mark-as-read, realtime subscribe
- `src/hooks/useWebRTCCall.ts` — manages RTCPeerConnection, local/remote streams, signaling via Supabase broadcast channel, call lifecycle
- `src/hooks/useIncomingCall.ts` — global subscription that listens for `call_sessions` rows where `callee_id = me AND status = 'ringing'`
- `src/components/communication/CommunicationPage.tsx` — split-pane: left = conversation list, right = chat thread + call buttons
- `src/components/communication/ChatThread.tsx`
- `src/components/communication/ConversationList.tsx`
- `src/components/communication/CallDialog.tsx` — full-screen modal showing local + remote video, controls (mute, camera, hang up)
- `src/components/communication/IncomingCallDialog.tsx` — ringing UI with accept/decline + ringtone
- `src/components/communication/CallProvider.tsx` — context provider mounted near app root so incoming calls work on any page

Wiring:
- Add `<CallProvider>` inside `App.tsx` (inside auth providers).
- Add a "Communication" entry to the main navigation and a route `/communication`.
- Reuse existing `UserSelectorDialog` to start a new conversation/call.

## Technical details

- `RTCPeerConnection` config: `{ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }`
- Signaling messages sent via `supabase.channel('call:'+callId).send({ type:'broadcast', event:'signal', payload:{...} })` — events: `offer`, `answer`, `ice`, `hangup`.
- Getting media: `navigator.mediaDevices.getUserMedia({ audio:true, video: type==='video' })` with permission-error handling.
- Ringtone: small generated tone via WebAudio (no asset needed) or a short looping audio file.
- Call timeout: if `ringing` for > 45s, mark as `missed`.
- Cleanup: close peer connection + stop tracks on hangup/unmount.

## Security notes

- Strict RLS on all three tables; never trust client-supplied `caller_id` — derive from `auth.uid()` in inserts.
- Edge function NOT required for Phase 1 (everything is client + Realtime + Postgres with RLS).

## Deliverable

A working Communication page where two logged-in employees can chat in real time and start/answer 1:1 voice or video calls, with incoming-call notifications anywhere in the app.