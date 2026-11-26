import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { walletLockInput } from "./input.ts";
Deno.test("attendance lock rejects caller-written reasons", () => {
  assertThrows(() => walletLockInput({ action: "apply", reason: "Pay someone" }));
  assertEquals(walletLockInput({ action: "apply" }).percentage, 35);
});
Deno.test("attendance lock validates percentage and action", () => {
  for (const percentage of [-1, 101, NaN, Infinity, "35"]) assertThrows(() => walletLockInput({ action: "apply", percentage }));
  assertThrows(() => walletLockInput({ action: "bogus" }));
  assertEquals(walletLockInput({ action: "release", percentage: 0 }).action, "release");
});