-- 0018_guard_salary.sql — per-guard monthly salary config (office-bearer set)
-- plus a payment log. Payments are logged individually rather than paid in one
-- shot so a guard can be given a partial early payment (urgency) and the rest
-- later in the same period.
CREATE TABLE IF NOT EXISTS guard_salary_config (
  guard_id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL,
  monthly_amount INTEGER NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_guard_salary_config_society ON guard_salary_config (society_id);

CREATE TABLE IF NOT EXISTS guard_salary_payments (
  id TEXT PRIMARY KEY,
  guard_id TEXT NOT NULL,
  society_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  period TEXT NOT NULL, -- salary month this payment counts toward, e.g. '2026-09'
  early INTEGER NOT NULL DEFAULT 0, -- 1 = paid ahead of the normal cycle (urgency/partial)
  note TEXT,
  paid_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_guard_salary_payments_guard ON guard_salary_payments (guard_id, period);
CREATE INDEX IF NOT EXISTS idx_guard_salary_payments_society ON guard_salary_payments (society_id);
