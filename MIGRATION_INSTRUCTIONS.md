# Database Migration: Add sms_alerts_enabled Column

## Problem
Production database is missing the `sms_alerts_enabled` column in the `users` table, causing errors:
```
psycopg2.errors.UndefinedColumn: column users.sms_alerts_enabled does not exist
```

## Solution
Add the missing column to the production database.

## Option 1: Run Migration from Backend Container (Recommended)

### Steps:
1. Access the DigitalOcean Console
2. Navigate to your App Platform > floodsense app > backend component
3. Click on "Console" tab
4. Run the migration script:
```bash
cd /app
python scripts/migrate_add_sms_column.py
```

The script will:
- Connect to the production database using DATABASE_URL
- Check if the column already exists
- Add the column if missing
- Verify the migration was successful

## Option 2: Connect to Database Directly

### Steps:
1. Get database connection details from DigitalOcean:
   - Go to Databases > db (your PostgreSQL database)
   - Copy the connection string

2. Use `psql` or any PostgreSQL client to connect

3. Run the SQL migration:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sms_alerts_enabled BOOLEAN DEFAULT FALSE;
```

4. Verify the column was added:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'sms_alerts_enabled';
```

## Option 3: Use DigitalOcean Database UI

1. Go to DigitalOcean Console > Databases > db
2. Click "Users & Databases" tab
3. Connect using the admin credentials
4. Navigate to SQL Editor or Console
5. Execute the SQL from Option 2

## After Migration

Once the migration is complete:
1. The `/stats/system` endpoint should work without errors
2. Admin user creation should succeed
3. All user queries will work properly

## Files Created

- `backend/scripts/migrate_add_sms_column.py` - Python migration script
- `backend/scripts/add_sms_alerts_column.sql` - Raw SQL migration
- `MIGRATION_INSTRUCTIONS.md` - This file

## Verification

After running the migration, test the endpoint:
```bash
curl https://floodsense-app-6a3uy.ondigitalocean.app/api/v1/stats/system
```

It should return system statistics instead of a 500 error.
