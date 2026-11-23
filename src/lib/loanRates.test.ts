import { it } from "node:test";
import assert from "node:assert/strict";
import { LOAN_TYPE_CONFIG } from "./loanMath";
it("business loan is 8% per month", () => assert.equal(LOAN_TYPE_CONFIG.business.monthlyRate, 8));
