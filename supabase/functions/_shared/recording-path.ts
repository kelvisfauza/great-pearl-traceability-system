/** Match the exact uploader/call layout used by the recording uploader. */
export function ownsRecordingPath(path: unknown, hostId: string, callId: string): boolean {
  if (typeof path !== 'string') return false;
  const prefix = `${hostId}/${callId}-`;
  return path.startsWith(prefix) && /^\d+\.(webm|m4a)$/.test(path.slice(prefix.length));
}