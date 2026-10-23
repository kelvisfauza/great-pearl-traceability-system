---
name: Guarantor recovery penalty
description: Borrower pays 5% penalty on any loan repayment recovered from a guarantor
type: feature
---
- When the daily loan collection takes money from a guarantor, the borrower is charged 5% of the amount recovered.
- Penalty goes to Profits (source LOAN_PENALTY).
- If the borrower's wallet can't cover it, overdraft is used (no extra access fee).
- Borrower gets email + SMS.
