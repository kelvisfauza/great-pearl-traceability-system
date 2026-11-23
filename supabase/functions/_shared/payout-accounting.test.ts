import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { recordedPayout, treasuryAlertPresentation } from "./payout-accounting.ts";

Deno.test("receipt failure blocks a real payout", async () => {
  let sends = 0;
  await assertRejects(() => recordedPayout("TEST", 65000, async () => { sends++; return { status: 200, body: {} }; }, () => true, async () => { throw new Error("Database unavailable"); }, () => {}));
  assertEquals(sends, 0);
});
Deno.test("accepted 65,000 payout stays accepted when accounting fails and is never resent", async () => {
  let sends = 0; let warnings = 0;
  const result = await recordedPayout("TEST", 65000, async () => { sends++; return { status: 202, body: { status: "success" } }; }, () => true,
    async name => { if (name === "settle_gosentepay_payout") throw new Error("fee account empty"); return true; }, () => { warnings++; });
  assertEquals(result.status, 202); assertEquals(sends, 1); assertEquals(warnings, 1);
});
Deno.test("duplicate receipt blocks a second provider call", async () => {
  let sends = 0;
  await assertRejects(() => recordedPayout("TEST", 65000, async () => { sends++; return { status: 200, body: {} }; }, () => true, async () => false, () => {}));
  assertEquals(sends, 0);
});
Deno.test("uncertain provider response is not marked accepted or rejected", async () => {
  const calls: string[] = [];
  await recordedPayout("TEST", 65000, async () => ({ status: 503, body: {} }), () => false, async name => { calls.push(name); return true; }, () => {});
  assertEquals(calls, ["prepare_gosentepay_payout"]);
});
Deno.test("drift-only alert asks for investigation rather than funding", () => {
  assertEquals(treasuryAlertPresentation(["drift"]).title, "Treasury reconciliation needs review");
  assertEquals(treasuryAlertPresentation(["drift", "low_balance"]).title, "Treasury accounts need attention");
});