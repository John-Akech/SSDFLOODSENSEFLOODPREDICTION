from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
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
    from models import database_models
    Base.metadata.create_all(bind=engine)


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