import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

/**
 * Profile photos live in the PRIVATE `profile_pictures` bucket.
 * Historic rows store a `.../object/public/profile_pictures/<path>` URL,
 * newer rows may store just the object path. Both resolve to the same
 * object path, which we then exchange for a short-lived signed URL.
 */
const BUCKET = 'profile_pictures';
const TTL_SECONDS = 60 * 60 * 8; // 8 hours

/** Pulls the storage object path out of any stored avatar value. */
export function extractAvatarPath(value?: string | null): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;

  // Already a bare object path
  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(new RegExp(`^${BUCKET}/`), '');
  }

  // Public or signed storage URL
  const match = raw.match(
    new RegExp(`/storage/v1/object/(?:public|sign)/${BUCKET}/([^?#]+)`, 'i'),
  );
  if (match) return decodeURIComponent(match[1]);

  return null;
}

// Cache signed URLs so lists don't re-sign the same object repeatedly.
const cache = new Map<string, { url: string; expiresAt: number }>();

/** Returns a signed URL for a stored avatar value, or null when unavailable. */
export async function getSignedAvatarUrl(value?: string | null): Promise<string | null> {
  const path = extractAvatarPath(value);
  if (!path) return null;

  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  cache.set(path, {
    url: data.signedUrl,
    // refresh a minute before real expiry
    expiresAt: Date.now() + (TTL_SECONDS - 60) * 1000,
  });
  return data.signedUrl;
}

/** React hook returning a signed avatar URL for the given stored value. */
export function useSignedAvatarUrl(value?: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(undefined);
      return;
    }
    getSignedAvatarUrl(value).then((signed) => {
      if (active) setUrl(signed || undefined);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return url;
}