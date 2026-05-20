## Group calls (mesh WebRTC) — implementation plan

### Scope
- Group voice & video calls inside the existing messaging system.
- Two entry points: (1) "Call group" button in a group conversation header, (2) "New group call" dialog where the caller picks 2–N people ad-hoc.
- Mesh topology: each participant opens one `RTCPeerConnection` per other participant. Hard cap **8** (audio-only allowed up to 12); UI warns above 6 that quality will degrade. 20-person calls will not be reliable on mesh — flagged in UI.

### Data model (new migration)
- `group_calls` — one row per group call session
  - `host_id` (auth user), `call_type` ('audio'|'video'), `status` ('ringing'|'active'|'ended'), `conversation_id` (nullable, links to messaging conversation if any), `started_at`, `ended_at`, `title` (nullable)
- `group_call_participants` — one row per invitee
  - `call_id` → `group_calls.id`, `user_id`, `status` ('ringing'|'joined'|'declined'|'left'|'missed'), `joined_at`, `left_at`
- RLS: only the host or any invited participant can read/update their own row.
- Realtime enabled on both tables.

### Signaling
- One Supabase realtime channel per call: `group-call:{call_id}`.
- Broadcast events between peers:
  - `join` — new peer announces presence (payload: `{ userId }`)
  - `offer` / `answer` — targeted (payload: `{ to, from, sdp }`)
  - `ice` — targeted ICE candidate
  - `leave` — peer leaving
- Glare rule: the peer with the **lexicographically smaller userId** creates the offer when two peers see each other.

### Frontend
- New `GroupCallContext.tsx` (separate from existing 1:1 `CallContext`) managing:
  - `Map<peerId, RTCPeerConnection>`, `Map<peerId, MediaStream>`
  - Local stream, mute/camera toggles, leave/end-for-all
- New UI: `GroupCallDialog.tsx` — tiled grid of remote videos + self-view, controls bar (mute/cam/leave/end).
- New `NewGroupCallDialog.tsx` — multi-select employee picker, audio/video toggle, "Start call" button.
- Incoming-group-call ringer reuses the existing `useRingtone` hook, with accept/decline.
- Add "Group call" buttons in `MessagingPanel` group-conversation header (voice + video icons).

### Non-goals (this pass)
- No TURN server change (keep current STUN/TURN config from 1:1).
- No screen sharing, no recording, no waiting room, no host transfer.
- No SFU. If 20-person quality is required, we'd swap to LiveKit later — the data model is compatible.

### Files touched
- New: migration, `src/contexts/GroupCallContext.tsx`, `src/components/calls/GroupCallDialog.tsx`, `src/components/calls/NewGroupCallDialog.tsx`, `src/components/calls/IncomingGroupCallToast.tsx`
- Edited: `src/App.tsx` (wrap provider), `src/components/messaging/MessagingPanel.tsx` (add group-call buttons + entry to new-group-call dialog)

### Risks / caveats called out in UI
- "Mesh group calls work best up to 6 people. Above that, expect choppy video — switch to audio-only."
- Browser tab must stay open to relay (no SFU). If host leaves, call ends for everyone else.