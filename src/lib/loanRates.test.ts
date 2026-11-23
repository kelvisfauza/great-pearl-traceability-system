import { it, expect } from "vitest";
import { LOAN_TYPE_CONFIG } from "./loanMath";
it("business loan is 8% per month", () => expect((LOAN_TYPE_CONFIG).business.monthlyRate).toBe(8));
