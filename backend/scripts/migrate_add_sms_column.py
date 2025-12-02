#!/usr/bin/env python3
"""
Migration script to add sms_alerts_enabled column to users table.

This script can be executed from the backend container or directly with DATABASE_URL.
It resolves the error: column users.sms_alerts_enabled does not exist

Usage:
    python migrate_add_sms_column.py
    
Environment Variables Required:
    DATABASE_URL - PostgreSQL connection string
"""

import os
import sys
import psycopg2
from psycopg2 import sql


def run_migration():
    """Execute the migration to add sms_alerts_enabled column."""

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    print("Connecting to database...")

    try:
        # Connect to the database
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        cursor = conn.cursor()

        print("Connected successfully!")
        print("\nChecking if sms_alerts_enabled column exists...")

        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'sms_alerts_enabled'
        """)

        existing = cursor.fetchone()

        if existing:
            print("✓ Column 'sms_alerts_enabled' already exists. No migration needed.")
            cursor.close()
            conn.close()
            return

        print("Column does not exist. Adding it now...\n")

        # Add the column
        cursor.execute("""
            ALTER TABLE users 
            ADD COLUMN sms_alerts_enabled BOOLEAN DEFAULT FALSE
        """)

        # Commit the transaction
        conn.commit()

        print("✓ Successfully added sms_alerts_enabled column to users table")

        # Verify the column was added
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'sms_alerts_enabled'
        """)

        result = cursor.fetchone()
        print(f"\nVerification:")
        print(f"  Column Name: {result[0]}")
        print(f"  Data Type: {result[1]}")
        print(f"  Default Value: {result[2]}")

        # Close connections
        cursor.close()
        conn.close()

        print("\n✓ Migration completed successfully!")

    except psycopg2.Error as e:
        print(f"\n✗ Database error occurred: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 60)
    print("FloodSense Database Migration")
    print("Adding sms_alerts_enabled column to users table")
    print("=" * 60)
    print()

    run_migration()
