from models.database_models import Prediction, FloodEvent
from core.database import SessionLocal
import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(__file__)), 'app'))


def check_data():
    db = SessionLocal()
    try:
        preds = db.query(Prediction).count()
        events = db.query(FloodEvent).count()
        print(f"Total Predictions: {preds}")
        print(f"Total Flood Events: {events}")
    finally:
        db.close()


if __name__ == "__main__":
    check_data()
