from models.database_models import Alert
from core.database import SessionLocal
import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(__file__)), 'app'))


def list_alerts():
    db = SessionLocal()
    try:
        alerts = db.query(Alert).all()
        print(f"Total alerts: {len(alerts)}")
        for alert in alerts:
            print(
                f"ID: {alert.id}, Active: {alert.is_active}, Severity: {alert.severity}, Msg: {alert.message}")
    finally:
        db.close()


if __name__ == "__main__":
    list_alerts()
