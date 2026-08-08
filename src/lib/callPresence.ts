// Tiny global flag so the presence heartbeat can publish a "busy / on a call"
// status without coupling GroupCallContext to the presence hook.
let inCall = false;
const listeners = new Set<(v: boolean) => void>();

export const setInCall = (value: boolean) => {
  if (inCall === value) return;
  inCall = value;
  listeners.forEach(l => { try { l(value); } catch {} });
};

export const getInCall = () => inCall;

export const onInCallChange = (cb: (v: boolean) => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
