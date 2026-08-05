-- Notification preferences for the Settings → Notifications tab.
--
-- The four toggles existed in the UI but were local component state only:
-- saving showed "Settings saved" while silently discarding the choice, and a
-- refresh reset them to defaults.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notifications JSONB
  DEFAULT '{"emailAlerts": true, "criticalOnly": false, "dailyDigest": true, "weeklyReport": true}'::jsonb;
