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

print("Creating all tables...")
Base.metadata.create_all(bind=engine)

# Verify
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()

print(f"\nTables created: {tables}")
print(f"Total: {len(tables)} tables")

if len(tables) == 7:
    print("\n[SUCCESS] All 7 tables created successfully!")
else:
    print(f"\n[WARNING] Expected 7 tables, got {len(tables)}")
