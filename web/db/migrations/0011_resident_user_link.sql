-- 0011_resident_user_link.sql — links a resident row to the account that owns
-- it, so "my flat" can be resolved server-side instead of trusting free text.
ALTER TABLE residents ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_residents_user ON residents (user_id);
