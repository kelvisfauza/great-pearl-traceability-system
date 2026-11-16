import { describe, expect, it } from "bun:test";
import { accountEvidence, employmentEvidence, enforceBusinessVerdict } from "./business-account-evidence";

const now = new Date("2026-11-16T08:07:00Z");
describe("business account evidence", () => {
  it("requires six completed months, never rounded-up tenure", () => {
    expect(employmentEvidence("2026-05-17T08:07:00Z", now).eligible).toBe(false);
    expect(employmentEvidence("2026-05-16T08:07:00Z", now).eligible).toBe(true);
  });
  it("does not substitute account creation for missing or future joining dates", () => {
    expect(employmentEvidence(null, now).eligible).toBe(false);
    expect(employmentEvidence("2027-01-01", now).join_date).toBeNull();
  });
  it("checks transactions and distinguishes loans from salary income", () => {
    const evidence = accountEvidence([
      { amount: 100000, created_at: "2026-10-01", source_category: "SALARY" },
      { amount: 500000, created_at: "2026-11-01", source_category: "LOAN_DISBURSEMENT" },
      { amount: -200000, created_at: "2026-11-02", source_category: "WITHDRAWAL" },
    ], 0, "2026-01-01", now);
    expect(evidence.transaction_count).toBe(3);
    expect(evidence.salary_credits).toBe(100000);
    expect(evidence.loan_disbursement_credits).toBe(500000);
    expect(evidence.debits).toBe(200000);
    expect(evidence.net_movement).toBe(400000);
    expect(evidence.active_months).toBe(2);
  });
  it("blocks an evaluation with no verifiable transactions", () => {
    expect(accountEvidence([], 100, "2026-01-01", now).blocking_reasons).toHaveLength(1);
  });
  it("blocks a negative wallet", () => {
    const rows = [{ amount: -10, created_at: "2026-11-01", source_category: "WITHDRAWAL" }];
    expect(accountEvidence(rows, -10, "2026-01-01", now).blocking_reasons).toHaveLength(1);
    expect(accountEvidence(rows, 0, "2026-01-01", now).blocking_reasons).toHaveLength(0);
  });
  it("prevents AI from overriding a denial or restoring a risk-reduced ceiling", () => {
    expect(enforceBusinessVerdict("approve", 1000000, 400000, []).amount).toBe(400000);
    expect(enforceBusinessVerdict("approve", 1000000, 400000, ["unverified"]).limit).toBe(0);
    expect(enforceBusinessVerdict("deny", 1000000, 400000, []).amount).toBe(0);
  });
});