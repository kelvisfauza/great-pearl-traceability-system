import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decodeSamplingPdf } from "./attachment.ts";
Deno.test("sampling accepts PDF bytes and missing optional attachment", () => {
  assertEquals(decodeSamplingPdf(undefined), null);
  assertEquals(new TextDecoder().decode(decodeSamplingPdf(btoa("%PDF-1.7\n")) ?? new Uint8Array()), "%PDF-1.7\n");
});
Deno.test("sampling rejects mislabeled and malformed attachments", () => {
  for (const value of ["", "bad!base64", btoa("<html>"), btoa("MZ executable"), btoa("PNG")]) assertThrows(() => decodeSamplingPdf(value));
});