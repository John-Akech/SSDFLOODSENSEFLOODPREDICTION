"""Simple database creation script"""
import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Import models to register them with Base
from core.database import Base, engine
from models.database_models import (
    User, FloodEvent, Prediction, Recommendation,
    Feedback, SARImage, RainfallRecord
)
from models.audit_log import AuditLog

print("Creating all tables...")
Base.metadata.create_all(bind=engine)

# Verify
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()

print(f"\nTables created: {tables}")
print(f"Total: {len(tables)} tables")

if len(tables) == 8:
    print("\n[SUCCESS] All 8 tables created successfully!")
    print("  - 7 main tables + 1 audit_logs table")
else:
    print(f"\n[WARNING] Expected 8 tables, got {len(tables)}")
