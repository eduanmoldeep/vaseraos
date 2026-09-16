-- 0015_maintenance_upi.sql — treasurer-configurable UPI ID for maintenance
-- payments; residents pay by scanning a QR generated from this ID + the
-- exact bill amount, then upload a screenshot for the treasurer to approve.
ALTER TABLE maintenance_settings ADD COLUMN upi_id TEXT;
