from app.models.database_models import User
from app.core.security import get_password_hash
from app.core.database import SessionLocal, Base, engine
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the 'backend' directory to sys.path to allow imports from 'app'
# This makes the script runnable from the project root.
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Now that the path is set, we can import from the app


def create_test_user():
    """Creates a test user for Locust performance tests."""
    # Ensure all tables are created in the database.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if the user already exists to avoid duplicates
        existing_user = db.query(User).filter(
            User.email == "test@example.com").first()
        if existing_user:
            print("Test user 'test@example.com' already exists.")
            return

        # Create and save the new test user
        hashed_password = get_password_hash("a_secure_password")
        user = User(
            email="test@example.com",
            hashed_password=hashed_password,
            full_name="Locust Test User",
            role="community_member",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print("Successfully created test user 'test@example.com'.")
    finally:
        db.close()


if __name__ == "__main__":
    print("Attempting to create Locust test user...")
    create_test_user()
