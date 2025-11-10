"""
Clear System History Script
Removes historical data while preserving user accounts and system configuration

Usage:
    python clear_history.py --all              # Clear everything except users
    python clear_history.py --predictions      # Clear predictions only
    python clear_history.py --alerts           # Clear alerts only
    python clear_history.py --feedback         # Clear feedback only
    python clear_history.py --gee              # Clear GEE extracted data
"""

import argparse
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def create_backup(engine, tables):
    """Create backup before deletion"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    print(f"\n📦 Creating backup: backup_{timestamp}.sql")
    
    # This would ideally use pg_dump, but for simplicity:
    print("⚠️  MANUAL BACKUP RECOMMENDED: Run this before clearing:")
    print(f"   docker-compose exec postgres pg_dump -U {settings.POSTGRES_USER} {settings.POSTGRES_DB} > backup_{timestamp}.sql")
    
    response = input("\nHave you created a backup? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Aborting. Please create a backup first.")
        sys.exit(1)

def clear_predictions(session):
    """Clear all prediction history"""
    print("\n🗑️  Clearing predictions...")
    result = session.execute(text("DELETE FROM predictions"))
    session.commit()
    print(f"   ✅ Deleted {result.rowcount} predictions")

def clear_alerts(session):
    """Clear all alert history"""
    print("\n🗑️  Clearing alerts...")
    result = session.execute(text("DELETE FROM alerts"))
    session.commit()
    print(f"   ✅ Deleted {result.rowcount} alerts")

def clear_feedback(session):
    """Clear all feedback"""
    print("\n🗑️  Clearing feedback...")
    result = session.execute(text("DELETE FROM feedback"))
    session.commit()
    print(f"   ✅ Deleted {result.rowcount} feedback entries")

def clear_gee_data(session):
    """Clear GEE extracted features"""
    print("\n🗑️  Clearing GEE extracted data...")
    result = session.execute(text("DELETE FROM gee_extracted_features"))
    session.commit()
    print(f"   ✅ Deleted {result.rowcount} GEE records")

def clear_flood_events(session):
    """Clear flood events (be careful - this is training data!)"""
    print("\n⚠️  WARNING: Clearing flood events will affect model training!")
    response = input("Are you sure? This is TRAINING DATA (yes/no): ")
    if response.lower() == 'yes':
        result = session.execute(text("DELETE FROM flood_events"))
        session.commit()
        print(f"   ✅ Deleted {result.rowcount} flood events")
    else:
        print("   ⏭️  Skipped flood events")

def clear_all_history(session):
    """Clear all historical data except users and system config"""
    print("\n🗑️  CLEARING ALL HISTORICAL DATA...")
    print("   (Keeping: users, system config, model metadata)")
    
    tables_to_clear = [
        "feedback",
        "alerts", 
        "predictions",
        "gee_extracted_features"
    ]
    
    total_deleted = 0
    for table in tables_to_clear:
        result = session.execute(text(f"DELETE FROM {table}"))
        print(f"   ✅ Cleared {table}: {result.rowcount} records")
        total_deleted += result.rowcount
    
    session.commit()
    print(f"\n✅ Total records deleted: {total_deleted}")

def vacuum_database(engine):
    """Reclaim space after deletions"""
    print("\n🧹 Vacuuming database to reclaim space...")
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(text("VACUUM ANALYZE"))
    print("   ✅ Database vacuumed")

def main():
    parser = argparse.ArgumentParser(description="Clear system history")
    parser.add_argument('--all', action='store_true', help='Clear all historical data')
    parser.add_argument('--predictions', action='store_true', help='Clear predictions only')
    parser.add_argument('--alerts', action='store_true', help='Clear alerts only')
    parser.add_argument('--feedback', action='store_true', help='Clear feedback only')
    parser.add_argument('--gee', action='store_true', help='Clear GEE extracted data')
    parser.add_argument('--flood-events', action='store_true', help='Clear flood events (TRAINING DATA!)')
    parser.add_argument('--no-backup', action='store_true', help='Skip backup confirmation')
    
    args = parser.parse_args()
    
    if not any([args.all, args.predictions, args.alerts, args.feedback, args.gee, args.flood_events]):
        parser.print_help()
        sys.exit(1)
    
    # Connect to database
    print(f"\n📊 Connecting to database: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Backup confirmation
        if not args.no_backup:
            create_backup(engine, [])
        
        # Execute clearing operations
        if args.all:
            clear_all_history(session)
        else:
            if args.predictions:
                clear_predictions(session)
            if args.alerts:
                clear_alerts(session)
            if args.feedback:
                clear_feedback(session)
            if args.gee:
                clear_gee_data(session)
            if args.flood_events:
                clear_flood_events(session)
        
        # Vacuum database
        vacuum_database(engine)
        
        print("\n✅ History cleared successfully!")
        print("\n📊 Remaining data:")
        
        # Show what's left
        tables = ['users', 'predictions', 'alerts', 'feedback', 'gee_extracted_features', 'flood_events']
        for table in tables:
            try:
                result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"   • {table}: {count} records")
            except Exception as e:
                print(f"   • {table}: Error - {e}")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    main()
