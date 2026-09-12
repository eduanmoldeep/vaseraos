-- 0013_help_tickets.sql — support tickets raised by any signed-in user,
-- reviewed by platform admins (the escalation path when a resident has no
-- society office to fix something themselves).
CREATE TABLE IF NOT EXISTS help_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  society_id TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_help_tickets_user ON help_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_help_tickets_status ON help_tickets (status);
