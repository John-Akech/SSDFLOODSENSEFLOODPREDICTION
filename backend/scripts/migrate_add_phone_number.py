#!/usr/bin/env python3
"""
Database migration script to add phone_number column to users table.
This fixes the production PostgreSQL database schema mismatch.

Run this on DigitalOcean:
    python scripts/migrate_add_phone_number.py
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError, ProgrammingError


def get_database_url():
    """Get database URL from environment variable."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    return db_url


def check_column_exists(engine, table_name, column_name):
    """Check if a column exists in a table."""
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    return any(col['name'] == column_name for col in columns)


def migrate_database():
    """Run the migration to add phone_number column."""
    print("Starting database migration...")
    print("=" * 60)

    # Get database connection
    db_url = get_database_url()
    print("Connecting to database...")

    try:
        engine = create_engine(db_url)

        with engine.connect() as connection:
            # Check if users table exists
            inspector = inspect(engine)
            tables = inspector.get_table_names()

            if "users" not in tables:
                print("ERROR: 'users' table does not exist!")
                sys.exit(1)

            print("✓ 'users' table found")

            # Check if phone_number column already exists
            if check_column_exists(engine, "users", "phone_number"):
                print("✓ 'phone_number' column already exists - no migration needed")
                return

            print("Adding 'phone_number' column to 'users' table...")

            # Add the phone_number column
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN phone_number VARCHAR(255) NULL;
            """))
            connection.commit()

            print("✓ 'phone_number' column added successfully")

            # Verify the column was added
            if check_column_exists(engine, "users", "phone_number"):
                print("✓ Migration verified - column exists")
            else:
                print("ERROR: Column was not added successfully")
                sys.exit(1)

            # Show current schema
            print("\nCurrent 'users' table schema:")
            columns = inspector.get_columns("users")
            for col in columns:
                nullable = "NULL" if col['nullable'] else "NOT NULL"
                print(f"  - {col['name']}: {col['type']} {nullable}")

            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("The application should now work correctly.")

    except OperationalError as e:
        print(f"ERROR: Database connection failed: {e}")
        sys.exit(1)
    except ProgrammingError as e:
        print(f"ERROR: SQL execution failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    migrate_database()
