// Statement pricing rules (set by Fauza Kelvis, 31 Oct 2026):
// - Emailed/system statement: UGX 500 per page of the generated PDF
// - Printing a statement: UGX 1,000 per print
export const STATEMENT_FEE_PER_PAGE = 500;
export const STATEMENT_PRINT_FEE = 1000;

export function statementFeeForPages(pages: number): number {
  if (!Number.isFinite(pages) || pages < 1) return STATEMENT_FEE_PER_PAGE;
  return Math.floor(pages) * STATEMENT_FEE_PER_PAGE;
}
