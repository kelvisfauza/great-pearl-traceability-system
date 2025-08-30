-- Create salary adjustment for Tumwine (correct overpayment)
INSERT INTO ledger_entries (
    user_id,
    entry_type,
    amount,
    reference,
    metadata,
    created_at
) VALUES (
    'alex_tumwine_temp_id',
    'SALARY_ADJUSTMENT',
    -106451.70,  -- negative amount to reduce balance
    'SALARY-CORRECTION-TUMWINE-200K',
    json_build_object(
        'reason', 'Salary correction from 300k to 200k',
        'employee_name', 'Alex tumwine',
        'correct_salary', 200000,
        'incorrect_salary', 300000,
        'days_affected', 30,
        'overpayment_corrected', 106451.70
    ),
    now()
);