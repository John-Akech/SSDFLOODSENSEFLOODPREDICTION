import sys
import os
from datetime import datetime, timedelta
import random

# Add app to path - MUST BE DONE BEFORE IMPORTS
sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(__file__)), 'app'))

try:
    from core.database import SessionLocal, init_db
    from models.database_models import Alert, Prediction, FloodEvent, User, Location, Shelter
    from core.security import get_password_hash
except ImportError:
    # Try adding the parent directory if the above fails (e.g. running from root)
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from app.core.database import SessionLocal, init_db
    from app.models.database_models import Alert, Prediction, FloodEvent, User, Location, Shelter
    from app.core.security import get_password_hash


def seed_data():
    print("Initializing database...")
    init_db()

    db = SessionLocal()

    try:
        print("Checking for existing data...")

        # Create a dummy user if not exists
        user = db.query(User).filter(
            User.email == "admin@floodsense.org").first()
        if not user:
            print("Creating admin user...")
            # Default password: admin123 (CHANGE THIS IN PRODUCTION!)
            user = User(
                email="admin@floodsense.org",
                hashed_password=get_password_hash("admin123"),
                full_name="System Admin",
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("✓ Admin user created: admin@floodsense.org / admin123")

        # Seed Locations (Real South Sudan Data)
        if db.query(Location).count() == 0:
            print("Seeding Locations...")
            locations_data = [
                {"name": "Juba", "lat": 4.8594, "lon": 31.5713, "type": "capital",
                    "population": 525953, "state": "Central Equatoria"},
                {"name": "Bor", "lat": 6.2092, "lon": 31.5563,
                    "type": "town", "population": 26800, "state": "Jonglei"},
                {"name": "Malakal", "lat": 9.5334, "lon": 31.6605,
                    "type": "town", "population": 147450, "state": "Upper Nile"},
                {"name": "Bentiu", "lat": 9.2628, "lon": 29.8021,
                    "type": "town", "population": 7700, "state": "Unity"},
                {"name": "Wau", "lat": 7.7011, "lon": 27.9953, "type": "town",
                    "population": 118331, "state": "Western Bahr el Ghazal"},
                {"name": "Yambio", "lat": 4.5721, "lon": 28.3955, "type": "town",
                    "population": 40382, "state": "Western Equatoria"},
                {"name": "Torit", "lat": 4.4133, "lon": 32.5678, "type": "town",
                    "population": 20050, "state": "Eastern Equatoria"},
                {"name": "Kuajok", "lat": 8.3103, "lon": 27.9903,
                    "type": "town", "population": 78111, "state": "Warrap"},
                {"name": "Aweil", "lat": 8.7674, "lon": 27.3907, "type": "town",
                    "population": 33537, "state": "Northern Bahr el Ghazal"},
                {"name": "Rumbek", "lat": 6.8117, "lon": 29.6780,
                    "type": "town", "population": 32100, "state": "Lakes"},
                {"name": "Yei", "lat": 4.0951, "lon": 30.6779, "type": "town",
                    "population": 260200, "state": "Central Equatoria"},
                {"name": "Renk", "lat": 11.8306, "lon": 32.8003,
                    "type": "town", "population": 69079, "state": "Upper Nile"},
                {"name": "Nasir", "lat": 8.6167, "lon": 33.0667,
                    "type": "town", "population": 43733, "state": "Upper Nile"},
                {"name": "Pibor", "lat": 6.8000, "lon": 33.1333,
                    "type": "town", "population": 1000, "state": "Jonglei"},
                {"name": "Akobo", "lat": 7.7833, "lon": 33.0000,
                    "type": "town", "population": 1000, "state": "Jonglei"}
            ]

            for loc in locations_data:
                db.add(Location(
                    name=loc["name"],
                    latitude=loc["lat"],
                    longitude=loc["lon"],
                    type=loc["type"],
                    population=loc["population"],
                    state=loc["state"]
                ))
            db.commit()

        # Seed Shelters (Real/Plausible South Sudan Data)
        if db.query(Shelter).count() == 0:
            print("Seeding Shelters...")
            shelters_data = [
                {"name": "UN House Juba", "lat": 4.8400, "lon": 31.5500,
                    "type": "un_base", "capacity": 5000},
                {"name": "Bor POC Site", "lat": 6.2200,
                    "lon": 31.5600, "type": "camp", "capacity": 2000},
                {"name": "Malakal POC Site", "lat": 9.5500,
                    "lon": 31.6700, "type": "camp", "capacity": 3000},
                {"name": "Bentiu POC Site", "lat": 9.2700,
                    "lon": 29.8100, "type": "camp", "capacity": 4000},
                {"name": "Wau Cathedral", "lat": 7.7000,
                    "lon": 27.9900, "type": "church", "capacity": 500},
                {"name": "St. Teresa Cathedral Juba", "lat": 4.8500,
                    "lon": 31.5700, "type": "church", "capacity": 800},
                {"name": "Rumbek Secondary School", "lat": 6.8100,
                    "lon": 29.6800, "type": "school", "capacity": 600},
                {"name": "Aweil Civil Hospital", "lat": 8.7700,
                    "lon": 27.4000, "type": "hospital", "capacity": 300}
            ]

            for shelter in shelters_data:
                db.add(Shelter(
                    name=shelter["name"],
                    latitude=shelter["lat"],
                    longitude=shelter["lon"],
                    type=shelter["type"],
                    capacity=shelter["capacity"],
                    is_active=True
                ))
            db.commit()

        # Check if data already exists
        alerts_count = db.query(Alert).count()
        events_count = db.query(FloodEvent).count()

        if alerts_count > 0 and events_count > 0:
            print("Data already exists (Alerts and Events). Skipping seed.")
            return

        print("Seeding data...")

        # Create Flood Events if missing
        events = []
        if events_count == 0:
            print("Seeding Flood Events...")
            locations = [
                {"name": "Bor, Jonglei", "lat": 6.2092, "lon": 31.5563},
                {"name": "Malakal, Upper Nile", "lat": 9.5334, "lon": 31.6605},
                {"name": "Bentiu, Unity", "lat": 9.2628, "lon": 29.8021},
                {"name": "Aweil, Northern Bahr el Ghazal",
                    "lat": 8.7674, "lon": 27.3907}
            ]

            for i, loc in enumerate(locations):
                event = FloodEvent(
                    date_time=datetime.now() - timedelta(days=random.randint(0, 5)),
                    latitude=loc["lat"],
                    longitude=loc["lon"],
                    severity=random.uniform(0.5, 0.9),
                    state=loc["name"].split(", ")[1],
                    location_name=loc["name"],
                    verified=True
                )
                db.add(event)
                events.append(event)

            db.commit()
            for e in events:
                db.refresh(e)
        else:
            events = db.query(FloodEvent).all()

        # Create Predictions if missing (or add more)
        # ... (rest of the script)

        # Create Predictions
        for event in events:
            for _ in range(3):  # 3 predictions per event
                pred = Prediction(
                    latitude=event.latitude + random.uniform(-0.05, 0.05),
                    longitude=event.longitude + random.uniform(-0.05, 0.05),
                    flood_probability=random.uniform(0.6, 0.95),
                    risk_level=random.choice(["high", "critical", "medium"]),
                    model_type=random.choice(["ensemble", "lstm", "tcn"]),
                    lead_time_hours=random.choice([24, 48, 72]),
                    confidence_score=random.uniform(0.7, 0.9),
                    flood_event_id=event.id,
                    user_id=user.id
                )
                db.add(pred)

        db.commit()

        # Create Alerts
        for event in events:
            alert = Alert(
                latitude=event.latitude,
                longitude=event.longitude,
                severity=random.choice(["high", "critical"]),
                message=f"Flood warning for {event.location_name}. Water levels rising.",
                is_active=True,
                expires_at=datetime.now() + timedelta(hours=24),
                created_by=user.id
            )
            db.add(alert)

        db.commit()
        print("Data seeded successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
