-- Self-service society registration + resident/society-admin membership.
-- Existing societies default to 'approved' so nothing already live is affected.

ALTER TABLE societies ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE societies ADD COLUMN join_code TEXT;
ALTER TABLE societies ADD COLUMN created_by TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_societies_join_code ON societies (join_code);

-- A user's role within one society. Separate from users.admin (platform-wide,
-- DB-only). role='admin' here only grants access to that one society.
CREATE TABLE IF NOT EXISTS society_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  society_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'resident',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, society_id)
);

CREATE INDEX IF NOT EXISTS idx_society_members_user ON society_members (user_id);
CREATE INDEX IF NOT EXISTS idx_society_members_society ON society_members (society_id);
