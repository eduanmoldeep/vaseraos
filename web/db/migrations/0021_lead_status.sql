-- 0021_lead_status.sql — sales pipeline status on leads:
-- new | follow_up | wip | closed_lost | closed_won
ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
