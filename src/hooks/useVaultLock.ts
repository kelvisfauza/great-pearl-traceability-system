import { useCallback, useEffect, useState } from 'react';

const KEY = 'vault_unlocked_at';
export const VAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity

const readUnlockedAt = (): number => {
  const raw = sessionStorage.getItem(KEY);
  const ts = raw ? Number(raw) : 0;
  return Number.isFinite(ts) ? ts : 0;
};

export const isVaultUnlocked = () => Date.now() - readUnlockedAt() < VAULT_TIMEOUT_MS;

export const markVaultUnlocked = () => {
  sessionStorage.setItem(KEY, String(Date.now()));
  window.dispatchEvent(new Event('vault-state'));
};

export const lockVault = () => {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event('vault-state'));
};

/**
 * Tracks whether the money vault is currently unlocked.
 * Re-locks automatically after 5 minutes without activity.
 */
export const useVaultLock = () => {
  const [unlocked, setUnlocked] = useState(isVaultUnlocked);

  const refresh = useCallback(() => setUnlocked(isVaultUnlocked()), []);

  useEffect(() => {
    const onState = () => refresh();
    window.addEventListener('vault-state', onState);
    const timer = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('vault-state', onState);
      window.clearInterval(timer);
    };
  }, [refresh]);

  // Any interaction while unlocked pushes the auto-lock further out.
  useEffect(() => {
    if (!unlocked) return;
    const bump = () => {
      if (isVaultUnlocked()) sessionStorage.setItem(KEY, String(Date.now()));
    };
    const events: (keyof WindowEventMap)[] = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, bump, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, bump));
  }, [unlocked]);

  return { unlocked, lock: lockVault, unlock: markVaultUnlocked, refresh };
};
