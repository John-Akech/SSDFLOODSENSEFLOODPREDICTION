from typing import List
from sqlalchemy.orm import Session

from app.models.database_models import Prediction as DBPrediction, Recommendation as DBRecommendation
from app.schemas.schemas import RecommendationCreate, Priority


class RecommendationService:
    @staticmethod
    def generate_for_prediction(prediction: DBPrediction) -> List[RecommendationCreate]:
        """Generate basic actionable recommendations based on a prediction.
        Heuristic: higher risk and probability -> stronger priority and more protective actions.
        """
        latitude = float(prediction.latitude)
        longitude = float(prediction.longitude)
        prob = float(prediction.flood_probability)
        risk = (prediction.risk_level or "low").lower()

        # Determine priority
        if risk in ["critical", "high"] or prob >= 0.8:
            priority = Priority.CRITICAL
        elif risk == "medium" or prob >= 0.6:
            priority = Priority.HIGH
        elif prob >= 0.4:
            priority = Priority.MEDIUM
        else:
            priority = Priority.LOW

        recs: List[RecommendationCreate] = []

        # Evacuation/alerting
        recs.append(RecommendationCreate(
            prediction_id=prediction.id,
            recommendation_type="community_alert",
            latitude=latitude,
            longitude=longitude,
            description="Issue targeted alerts to nearby communities and responders.",
            priority=priority,
            estimated_cost=None,
        ))

        # Dyke/berm placement suggestion nearby
        recs.append(RecommendationCreate(
            prediction_id=prediction.id,
            recommendation_type="dyke_placement",
            latitude=latitude,
            longitude=longitude,
            description="Prepare sandbags/dykes along vulnerable banks; reinforce weak segments.",
            priority=priority if priority in [
                Priority.HIGH, Priority.CRITICAL] else Priority.MEDIUM,
            estimated_cost=5000.0 if priority in [
                Priority.HIGH, Priority.CRITICAL] else 1500.0,
        ))

        # Resource pre-positioning
        recs.append(RecommendationCreate(
            prediction_id=prediction.id,
            recommendation_type="resource_staging",
            latitude=latitude,
            longitude=longitude,
            description="Pre-position pumps, boats, food, and medical supplies at safe high ground.",
            priority=priority,
            estimated_cost=8000.0 if priority in [
                Priority.HIGH, Priority.CRITICAL] else 3000.0,
        ))

        return recs

    @staticmethod
    def upsert_recommendations(db: Session, recommendations: List[RecommendationCreate]) -> List[DBRecommendation]:
        saved: List[DBRecommendation] = []
        for rec in recommendations:
            db_rec = DBRecommendation(
                prediction_id=rec.prediction_id,
                recommendation_type=rec.recommendation_type,
                latitude=rec.latitude,
                longitude=rec.longitude,
                description=rec.description,
                priority=rec.priority.value if hasattr(
                    rec.priority, 'value') else str(rec.priority),
                estimated_cost=rec.estimated_cost,
            )
            db.add(db_rec)
            saved.append(db_rec)
        db.commit()
        for rec in saved:
            db.refresh(rec)
        return saved
