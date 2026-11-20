import { it } from "node:test";
import { strict as assert } from "node:assert";
import { accruedInterest } from "./investAccrual";
const base = { amount: 1_000_000, interest_rate: 25, start_date: "2026-09-01", maturity_date: "2026-12-01", status: "active", earned_interest: 0 };
it("full 25% at maturity", () => assert.equal(accruedInterest(base, new Date("2026-12-05T00:00:00")), 250_000));
it("zero on start day", () => assert.equal(accruedInterest(base, new Date("2026-09-01T00:00:00")), 0));
it("uses saved interest once closed", () => assert.equal(accruedInterest({ ...base, status: "matured", earned_interest: 123 }), 123));
