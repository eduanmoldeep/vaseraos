-- 0009_google_auth.sql — Google OAuth sign-in. password_hash stays NOT NULL;
-- Google-only accounts get a random unusable placeholder (see lib/auth.ts).
ALTER TABLE users ADD COLUMN google_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
