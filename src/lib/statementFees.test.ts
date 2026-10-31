import { describe, it, expect } from 'vitest';
import { STATEMENT_FEE_PER_PAGE, STATEMENT_PRINT_FEE, statementFeeForPages } from './statementFees';

describe('statement pricing rules', () => {
  it('charges UGX 500 per statement page', () => {
    expect(STATEMENT_FEE_PER_PAGE).toBe(500);
    expect(statementFeeForPages(1)).toBe(500);
    expect(statementFeeForPages(3)).toBe(1500);
    expect(statementFeeForPages(7)).toBe(3500);
  });

  it('charges UGX 1,000 per printed statement', () => {
    expect(STATEMENT_PRINT_FEE).toBe(1000);
  });

  it('never charges less than one page', () => {
    expect(statementFeeForPages(0)).toBe(500);
  });
});
