import { supabase } from '@/integrations/supabase/client';

export const REPORT_BUCKET = 'report-documents';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

export const validateReportFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Please upload a valid image (JPEG, PNG) or PDF file';
  if (file.size > MAX_SIZE) return 'File size must be less than 10MB';
  return null;
};

/** Normalise legacy values (full public/signed URLs) to a storage object path */
export const toStoragePath = (value?: string | null): string | null => {
  if (!value) return null;
  let path = value.trim();
  if (!path) return null;
  const marker = `/${REPORT_BUCKET}/`;
  const idx = path.indexOf(marker);
  if (idx !== -1) path = path.slice(idx + marker.length);
  path = path.split('?')[0];
  return path.replace(/^\/+/, '');
};

/** Uploads a report document and returns its storage path. Throws on failure. */
export const uploadReportDocument = async (file: File): Promise<string> => {
  const invalid = validateReportFile(file);
  if (invalid) throw new Error(invalid);

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) throw new Error('You must be signed in to upload documents');

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const filePath = `${uid}/reports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(REPORT_BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false, cacheControl: '3600' });

  if (error) throw new Error(error.message || 'Upload failed');

  // Verify the object is actually retrievable before we let the report save
  const { error: verifyError } = await supabase.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(filePath, 60);
  if (verifyError) throw new Error('Upload could not be verified: ' + verifyError.message);

  return filePath;
};

/** Returns a temporary signed URL for viewing a stored report document. */
export const getReportDocumentUrl = async (value?: string | null): Promise<string | null> => {
  const path = toStoragePath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
};

export const hasAttachments = (report: any): boolean =>
  Boolean(report?.attachment_url || report?.delivery_note_url || report?.dispatch_report_url);
