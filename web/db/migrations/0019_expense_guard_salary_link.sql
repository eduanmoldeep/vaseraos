-- 0019_expense_guard_salary_link.sql — trace an expense back to the guard
-- salary payment that generated it, when it came from that flow rather than
-- a manually-logged expense.
ALTER TABLE expenses ADD COLUMN guard_salary_payment_id TEXT;
