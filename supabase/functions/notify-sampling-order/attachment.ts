import { checkUpload } from "../_shared/file-check.ts";

export function decodeSamplingPdf(value: string | undefined): Uint8Array | null {
  if (value === undefined) return null;
  const base64 = value.replace(/^data:application\/pdf;base64,/, "");
  if (!base64 || base64.length > 14_000_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error("Invalid PDF encoding");
  }
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const checked = checkUpload(bytes, ["pdf"], 10 * 1024 * 1024);
  if (!checked.ok) throw new Error(checked.error);
  return bytes;
}