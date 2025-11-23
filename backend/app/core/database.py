from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.orm import declarative_base, sessionmaker
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
try:
    from app.core.config import settings
except ImportError:  # pragma: no cover
    from core.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Engine with production-ready pooling and health checks
engine_kwargs = {
    "connect_args": {"check_same_thread": False} if is_sqlite else {},
    "pool_pre_ping": True,
    "future": True,
    "echo": False,  # Never log SQL queries in production (security)
}
if not is_sqlite:
    # PostgreSQL-specific secure connection settings
    import urllib.parse
    parsed_url = urllib.parse.urlparse(settings.DATABASE_URL)

    # Extract SSL mode from query params or default to prefer
    query_params = urllib.parse.parse_qs(parsed_url.query)
    sslmode = query_params.get('sslmode', ['prefer'])[0]

    # Secure PostgreSQL connection arguments
    pg_connect_args = {}

    # SSL/TLS configuration - require SSL in production
    if sslmode in ['require', 'verify-ca', 'verify-full']:
        pg_connect_args['sslmode'] = sslmode
        # If using verify-ca or verify-full, you'll need SSL certificates
        # For now, we use 'require' which encrypts without certificate verification
        # In production with proper certificates, use 'verify-full'

    # Connection security settings
    pg_connect_args.update({
        'connect_timeout': 10,  # Timeout after 10 seconds
        'application_name': 'floodsense_backend',  # Identify connections in logs
        'options': '-c statement_timeout=30000',  # 30 second query timeout
    })

    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 3600,  # Recycle connections after 1 hour
        "pool_reset_on_return": "commit",  # Reset connection state
        "connect_args": pg_connect_args
    })

# Create engine with security-hardened configuration
# Note: DATABASE_URL should never be logged with credentials
engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
metadata = MetaData()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    import os
    if is_sqlite:
        db_path = settings.DATABASE_URL.replace('sqlite:///', '')
        db_dir = os.path.dirname(db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
    Base.metadata.create_all(bind=engine)

    # Create default admin user if it doesn't exist
    create_default_admin()


def create_default_admin():
    """Create a default admin user if none exists"""
    try:
        from models.database_models import User
        from core.security import get_password_hash

        db = SessionLocal()
        try:
            # Check if admin user exists
            admin_exists = db.query(User).filter(
                User.email == "admin@floodsense.org").first()
            if not admin_exists:
                admin_user = User(
                    email="admin@floodsense.org",
                    hashed_password=get_password_hash("admin123"),
                    full_name="System Administrator",
                    role="admin",
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print(
                    "[OK] Default admin user created: admin@floodsense.org / admin123")
            else:
                print("[INFO] Admin user already exists")
        finally:
            db.close()
    except Exception as e:
        print(f"[WARNING] Could not create default admin user: {e}")


# SQLite performance pragmas for development
if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # WAL mode improves concurrency; NORMAL is safer than OFF for sync
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA temp_store=MEMORY;")
        cursor.execute("PRAGMA cache_size=-64000;")  # ~64MB page cache
        cursor.close()
