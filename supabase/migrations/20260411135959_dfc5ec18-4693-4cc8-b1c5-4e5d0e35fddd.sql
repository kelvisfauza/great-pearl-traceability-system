ALTER TABLE public.investments ALTER COLUMN maturity_months SET DEFAULT 3;
ALTER TABLE public.investments ALTER COLUMN maturity_date SET DEFAULT (now() + interval '3 months');