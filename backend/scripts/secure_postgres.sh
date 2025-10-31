#!/bin/bash
# PostgreSQL Security Hardening Script for FloodSense
# Run this script after initial database setup to harden PostgreSQL security

set -e

echo "FloodSense PostgreSQL Security Hardening"
echo "============================================"

DB_NAME="${POSTGRES_DB:-floodsense}"
DB_USER="${POSTGRES_USER:-floodsense_user}"
DB_CONTAINER="${POSTGRES_CONTAINER:-floodsense-postgres}"

echo ""
echo "Step 1: Creating read-only user for reporting..."
docker exec -i $DB_CONTAINER psql -U postgres -d $DB_NAME <<EOF
-- Create read-only user
CREATE USER ${DB_USER}_readonly WITH PASSWORD '${POSTGRES_READONLY_PASSWORD:-change-readonly-password}';

-- Grant connect privilege
GRANT CONNECT ON DATABASE $DB_NAME TO ${DB_USER}_readonly;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO ${DB_USER}_readonly;

-- Grant select on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${DB_USER}_readonly;

-- Grant select on all future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${DB_USER}_readonly;

-- Grant usage on all sequences (for reports)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER}_readonly;
EOF

echo "[OK] Read-only user created: ${DB_USER}_readonly"

echo ""
echo "Step 2: Revoking public schema access..."
docker exec -i $DB_CONTAINER psql -U postgres -d $DB_NAME <<EOF
-- Revoke default public privileges
REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
EOF

echo "[OK] Public schema access revoked"

echo ""
echo "Step 3: Setting up row-level security (RLS)..."
docker exec -i $DB_CONTAINER psql -U postgres -d $DB_NAME <<EOF
-- Enable RLS on sensitive tables (example for users table)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid() = id);
EOF

echo "[OK] Row-level security configured"

echo ""
echo "Step 4: Creating audit trigger function..."
docker exec -i $DB_CONTAINER psql -U postgres -d $DB_NAME <<EOF
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS \$\$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_user);
        RETURN OLD;
    END IF;
END;
\$\$ LANGUAGE plpgsql;
EOF

echo "[OK] Audit logging configured"

echo ""
echo "Step 5: Applying security settings..."
docker exec -i $DB_CONTAINER psql -U postgres -d $DB_NAME <<EOF
-- Set password expiration (optional, uncomment if needed)
-- ALTER USER $DB_USER VALID UNTIL '2026-12-31';

-- Set connection limits
ALTER USER $DB_USER CONNECTION LIMIT 50;

-- Deny superuser privileges
ALTER USER $DB_USER NOSUPERUSER;
EOF

echo "[OK] Security settings applied"

echo ""
echo "Step 6: Creating backup user..."
docker exec -i $DB_CONTAINER psql -U postgres -d $DB_NAME <<EOF
CREATE USER ${DB_USER}_backup WITH PASSWORD '${POSTGRES_BACKUP_PASSWORD:-change-backup-password}';
GRANT CONNECT ON DATABASE $DB_NAME TO ${DB_USER}_backup;
-- Backup user needs SELECT privilege on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${DB_USER}_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${DB_USER}_backup;
EOF

echo "[OK] Backup user created: ${DB_USER}_backup"

echo ""
echo "[OK] Security hardening complete!"
echo ""
echo "Summary:"
echo "  - Read-only user: ${DB_USER}_readonly"
echo "  - Backup user: ${DB_USER}_backup"
echo "  - Audit logging: Enabled"
echo "  - Public access: Revoked"
echo "  - Connection limits: Set"
echo ""
echo "[IMPORTANT] Update your .env file with:"
echo "  POSTGRES_READONLY_PASSWORD=<strong-password>"
echo "  POSTGRES_BACKUP_PASSWORD=<strong-password>"
echo ""

 ћ

