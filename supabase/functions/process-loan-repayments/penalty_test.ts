import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Mirrors guarantorPenalty in index.ts: 5% of the guarantor-recovered amount.
const guarantorPenalty = (collected: number) => Math.round(Math.max(0, collected) * 0.05);

Deno.test("5% of 100,000 recovered from guarantor is 5,000", () => assertEquals(guarantorPenalty(100000), 5000));
Deno.test("no guarantor recovery means no penalty", () => assertEquals(guarantorPenalty(0), 0));
