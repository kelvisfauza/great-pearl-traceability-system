// Identify uploaded files by their first bytes instead of trusting the
// caller-supplied type or file name.
export type Kind = "jpg" | "png" | "webp" | "pdf" | "doc" | "docx";
const MIME: Record<Kind, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export function sniff(b: Uint8Array): Kind | null {
  const s = (o: number, sig: number[]) => sig.every((v, i) => b[o + i] === v);
  if (s(0, [0xff, 0xd8, 0xff])) return "jpg";
  if (s(0, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (s(0, [0x52, 0x49, 0x46, 0x46]) && s(8, [0x57, 0x45, 0x42, 0x50])) return "webp";
  if (s(0, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (s(0, [0xd0, 0xcf, 0x11, 0xe0])) return "doc";
  if (s(0, [0x50, 0x4b, 0x03, 0x04])) return "docx";
  return null;
}
export function checkUpload(bytes: Uint8Array, allowed: Kind[], maxBytes: number):
  { ok: true; kind: Kind; mime: string } | { ok: false; error: string } {
  if (bytes.byteLength === 0) return { ok: false, error: "The file is empty." };
  if (bytes.byteLength > maxBytes) return { ok: false, error: `The file is larger than ${Math.round(maxBytes / 1048576)}MB.` };
  const kind = sniff(bytes);
  if (!kind || !allowed.includes(kind)) return { ok: false, error: `Only ${allowed.join(", ").toUpperCase()} files are accepted.` };
  return { ok: true, kind, mime: MIME[kind] };
}
