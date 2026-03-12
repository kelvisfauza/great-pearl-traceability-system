-- Fix Timothy's loan repayment due dates to be 30-day intervals from start date (March 12)
UPDATE loan_repayments SET due_date = '2026-04-11' WHERE id = '8f1611b9-43ab-41f4-a737-073aea74679e';
UPDATE loan_repayments SET due_date = '2026-05-11' WHERE id = '0748b22c-cca4-43cf-8a3d-7cafff10edf5';