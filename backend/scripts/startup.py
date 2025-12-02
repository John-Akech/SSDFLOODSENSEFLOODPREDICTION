#!/usr/bin/env python3
"""
Startup script for FloodSense backend.
Handles database migrations and initialization before starting the API server.
"""

import os
import sys
import time
import subprocess
from pathlib import Path


def print_header(message):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(message)
    print("=" * 60)


def wait_for_database(max_attempts=30):
    """Wait for PostgreSQL database to be ready."""
    if not os.getenv("DATABASE_URL"):
        print("No DATABASE_URL found - skipping database wait")
        return True

    print("Waiting for database to be ready...")

    for attempt in range(1, max_attempts + 1):
        try:
            import psycopg2
            conn = psycopg2.connect(os.environ["DATABASE_URL"])
            conn.close()
            print(f"✓ Database is ready (attempt {attempt}/{max_attempts})")
            return True
        except Exception as e:
            if attempt == max_attempts:
                print(
                    f"ERROR: Database connection timeout after {max_attempts} attempts")
                print(f"Last error: {e}")
                return False
            print(f"Database not ready yet... ({attempt}/{max_attempts})")
            time.sleep(1)

    return False


def run_migrations():
    """Run database migrations."""
    print_header("Running Database Migrations")

    migration_script = Path("scripts/migrate_add_phone_number.py")

    if not migration_script.exists():
        print(f"WARNING: Migration script not found: {migration_script}")
        return True

    try:
        result = subprocess.run(
            [sys.executable, str(migration_script)],
            capture_output=True,
            text=True,
            timeout=60
        )

        print(result.stdout)

        if result.returncode == 0:
            print("✓ Migrations completed successfully")
            return True
        else:
            print(f"WARNING: Migration returned code {result.returncode}")
            print(result.stderr)
            print("Continuing startup - migration may have already been applied")
            return True

    except subprocess.TimeoutExpired:
        print("WARNING: Migration timed out after 60 seconds")
        return True
    except Exception as e:
        print(f"WARNING: Migration error: {e}")
        print("Continuing startup...")
        return True


def initialize_database():
    """Initialize database tables."""
    print_header("Initializing Database Tables")

    try:
        from app.core.database import engine, Base
        from app.models import database_models, audit_log

        Base.metadata.create_all(bind=engine)
        print("✓ Database tables initialized")
        return True

    except Exception as e:
        print(f"ERROR: Failed to initialize database: {e}")
        return False


def start_server():
    """Start the Uvicorn server."""
    print_header("Starting API Server")

    try:
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
    except Exception as e:
        print(f"ERROR: Failed to start server: {e}")
        sys.exit(1)


def main():
    """Main startup sequence."""
    print_header("FloodSense Backend Startup")

    # Step 1: Wait for database
    if not wait_for_database():
        sys.exit(1)

    # Step 2: Run migrations
    run_migrations()

    # Step 3: Initialize tables
    if not initialize_database():
        sys.exit(1)

    # Step 4: Start server
    start_server()


if __name__ == "__main__":
    main()
