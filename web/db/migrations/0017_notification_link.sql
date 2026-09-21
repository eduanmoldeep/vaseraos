-- 0017_notification_link.sql — where a notification should take you when
-- clicked (bell dropdown item or push notification). Generic so any future
-- notifySociety() caller (complaint status, bill approval, etc.) can supply
-- its own destination, not just notices.
ALTER TABLE notifications ADD COLUMN link TEXT;
