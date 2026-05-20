// Helpers for OS-level incoming-call notifications.
//
// Most browsers (Chrome, Safari, Edge) ignore Notification.requestPermission()
// unless it is triggered by a user gesture. We attach a one-time gesture
// listener so the very first click/tap/keypress after the app loads will
// prompt the user for notification access. After that we can show pop-ups
// even when the tab is backgrounded (user watching a movie on YouTube, etc.).

let gestureBound = false;

export const ensureNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'default') return; // granted or denied
  if (gestureBound) return;
  gestureBound = true;
  const ask = () => {
    try { Notification.requestPermission().catch(() => {}); } catch {}
    window.removeEventListener('pointerdown', ask);
    window.removeEventListener('keydown', ask);
    window.removeEventListener('touchstart', ask);
  };
  window.addEventListener('pointerdown', ask, { once: true });
  window.addEventListener('keydown', ask, { once: true });
  window.addEventListener('touchstart', ask, { once: true });
};

export interface CallNotificationOpts {
  title: string;
  body: string;
  tag: string;
}

// Show an OS-level notification for an incoming call. Safe to call from
// anywhere — silently no-ops if permission isn't granted. Always attempts
// to refocus the tab when the user clicks the notification.
export const showCallNotification = ({ title, body, tag }: CallNotificationOpts) => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag,
      requireInteraction: true,
    });
    n.onclick = () => {
      try { window.focus(); } catch {}
      try { n.close(); } catch {}
    };
  } catch (e) {
    console.warn('[call] notification failed', e);
  }
};