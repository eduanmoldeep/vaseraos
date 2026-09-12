-- 0010_ledger.sql — society ledger: treasurer-logged expenses (with receipts)
-- plus receipts on paid dues, so income + outflow live in one place.
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  vendor TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  receipt_key TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_society ON expenses (society_id);

ALTER TABLE maintenance_bills ADD COLUMN receipt_key TEXT;
ALTER TABLE maintenance_bills ADD COLUMN paid_at TEXT;
