import { describe, it, expect } from "vitest";
import { accruedInterest } from "./investAccrual";
const base = { amount: 1_000_000, interest_rate: 25, start_date: "2026-09-01", maturity_date: "2026-12-01", status: "active", earned_interest: 0 };
describe("accruedInterest", () => {
  it("full 25% at maturity", () => expect(accruedInterest(base, new Date("2026-12-05T00:00:00"))).toBe(250_000));
  it("zero on start day", () => expect(accruedInterest(base, new Date("2026-09-01T00:00:00"))).toBe(0));
  it("uses saved interest once closed", () => expect(accruedInterest({ ...base, status: "matured", earned_interest: 123 })).toBe(123));
});
