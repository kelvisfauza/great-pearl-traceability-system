import { supabase } from '@/integrations/supabase/client';

export const DISPATCH_BUCKET = 'dispatch-attachments';

/**
 * Normalise a stored value (storage path, or a legacy public/signed URL) to a
 * storage object path inside the dispatch-attachments bucket.
 */
export const toDispatchStoragePath = (value?: string | null): string | null => {
  if (!value) return null;
  let path = String(value).trim();
  if (!path) return null;
  const marker = `/${DISPATCH_BUCKET}/`;
  const idx = path.indexOf(marker);
  if (idx !== -1) path = path.slice(idx + marker.length);
  path = path.split('?')[0];
  return path.replace(/^\/+/, '') || null;
};

/** Returns a freshly signed, viewable URL for a stored dispatch attachment. */
export const getDispatchAttachmentUrl = async (value?: string | null): Promise<string | null> => {
  const path = toDispatchStoragePath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(DISPATCH_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
};

/** Opens a stored dispatch attachment in a new tab using a fresh signed URL. */
export const openDispatchAttachment = async (value?: string | null): Promise<boolean> => {
  const url = await getDispatchAttachmentUrl(value);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
