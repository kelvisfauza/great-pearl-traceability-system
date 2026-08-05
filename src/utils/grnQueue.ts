// Shared GRN payment queue so Finance can scan several GRNs once and pay them one by one.

export type GrnQueueItem = {
  ref: string;
  addedAt: string;
  paid?: boolean;
};

const QUEUE_KEY = "grn_pay_queue";
const SESSION_KEY = "grn_scan_session";
const EVENT = "grn-queue-changed";
const PAIR_KEY = "grn_paired_device";
const PAIR_EVENT = "grn-pairing-changed";

export type PairedDevice = {
  name: string;
  pairedAt: string;
  lastSeenAt: string;
};

export function getPairedDevice(): PairedDevice | null {
  try {
    const raw = localStorage.getItem(PAIR_KEY);
    return raw ? (JSON.parse(raw) as PairedDevice) : null;
  } catch {
    return null;
  }
}

export function setPairedDevice(name: string) {
  const existing = getPairedDevice();
  const device: PairedDevice = {
    name: name || existing?.name || "Phone",
    pairedAt: existing?.pairedAt || new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
  localStorage.setItem(PAIR_KEY, JSON.stringify(device));
  window.dispatchEvent(new CustomEvent(PAIR_EVENT));
}

export function clearPairedDevice() {
  localStorage.removeItem(PAIR_KEY);
  window.dispatchEvent(new CustomEvent(PAIR_EVENT));
}

/** Forget the phone AND rotate the pairing session so the old phone is disconnected. */
export function unpairDevice() {
  clearPairedDevice();
  localStorage.removeItem(SESSION_KEY);
}

export function subscribePairing(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(PAIR_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(PAIR_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Stable pairing session id so the phone stays connected across pages. */
export function getScanSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getQueue(): GrnQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(items: GrnQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 50)));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Returns true when the reference was newly added. */
export function addToQueue(ref: string): boolean {
  const clean = (ref || "").trim();
  if (!clean) return false;
  const items = getQueue();
  if (items.some((i) => i.ref.toUpperCase() === clean.toUpperCase())) return false;
  write([...items, { ref: clean, addedAt: new Date().toISOString() }]);
  return true;
}

export function removeFromQueue(ref: string) {
  write(getQueue().filter((i) => i.ref.toUpperCase() !== ref.toUpperCase()));
}

export function markQueuePaid(ref: string) {
  write(getQueue().map((i) => (i.ref.toUpperCase() === ref.toUpperCase() ? { ...i, paid: true } : i)));
}

export function clearQueue() {
  write([]);
}

/** Next unpaid reference after the given one (wraps to the first pending). */
export function nextPending(currentRef?: string): string | null {
  const items = getQueue().filter((i) => !i.paid);
  if (items.length === 0) return null;
  const idx = items.findIndex((i) => i.ref.toUpperCase() === (currentRef || "").toUpperCase());
  const next = items[idx + 1] || items.find((i) => i.ref.toUpperCase() !== (currentRef || "").toUpperCase());
  return next ? next.ref : null;
}

export function subscribeQueue(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
