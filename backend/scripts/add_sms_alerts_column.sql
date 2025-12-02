-- Migration script to add sms_alerts_enabled column to users table
-- This resolves: column users.sms_alerts_enabled does not exist

-- Add the missing column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sms_alerts_enabled BOOLEAN DEFAULT FALSE;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'sms_alerts_enabled';
