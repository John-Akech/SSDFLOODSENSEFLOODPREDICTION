-- Database initialization and migration script
-- This runs automatically on DigitalOcean App Platform startup
-- Add phone_number column if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'phone_number'
) THEN
ALTER TABLE users
ADD COLUMN phone_number VARCHAR(255);
END IF;
END $$;