-- Society "office" roles — separate from society_members.role (admin/resident).
-- A user can hold any combination (president, secretary, treasurer), and
-- different offices can go to the same person or different people.

CREATE TABLE IF NOT EXISTS society_offices (
  society_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  office TEXT NOT NULL, -- 'president' | 'secretary' | 'treasurer'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (society_id, user_id, office)
);

CREATE INDEX IF NOT EXISTS idx_society_offices_society ON society_offices (society_id);
CREATE INDEX IF NOT EXISTS idx_society_offices_user ON society_offices (user_id);
