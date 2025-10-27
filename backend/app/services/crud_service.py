from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.database_models import User, FloodEvent, Prediction, Recommendation, Feedback
from schemas.schemas import UserCreate, UserUpdate, FloodEventCreate, RecommendationCreate
from core.security import get_password_hash


class CRUDService:
    """CRUD operations for all database entities"""
    
    # User CRUD
    @staticmethod
    def create_user(db: Session, user: UserCreate) -> User:
        hashed_password = get_password_hash(user.password)
        db_user = User(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            role=user.role,
            language=user.language,
            contact_info=user.contact_info
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def get_user(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        db_user = db.query(User).filter(User.id == user_id).first()
        if db_user:
            for field, value in user_update.dict(exclude_unset=True).items():
                setattr(db_user, field, value)
            db.commit()
            db.refresh(db_user)
        return db_user
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        db_user = db.query(User).filter(User.id == user_id).first()
        if db_user:
            db.delete(db_user)
            db.commit()
            return True
        return False
    
    # Flood Event CRUD
    @staticmethod
    def create_flood_event(db: Session, event: FloodEventCreate, user_id: int) -> FloodEvent:
        db_event = FloodEvent(
            date_time=event.date_time,
            latitude=event.latitude,
            longitude=event.longitude,
            severity=event.severity,
            state=event.state,
            location_name=event.location_name,
            reported_by=user_id
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return db_event
    
    @staticmethod
    def get_flood_event(db: Session, event_id: int) -> Optional[FloodEvent]:
        return db.query(FloodEvent).filter(FloodEvent.id == event_id).first()
    
    @staticmethod
    def get_flood_events(db: Session, skip: int = 0, limit: int = 100) -> List[FloodEvent]:
        return db.query(FloodEvent).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_flood_event(db: Session, event_id: int, event_data: Dict[str, Any]) -> Optional[FloodEvent]:
        db_event = db.query(FloodEvent).filter(FloodEvent.id == event_id).first()
        if db_event:
            for field, value in event_data.items():
                if hasattr(db_event, field):
                    setattr(db_event, field, value)
            db.commit()
            db.refresh(db_event)
        return db_event
    
    @staticmethod
    def delete_flood_event(db: Session, event_id: int) -> bool:
        db_event = db.query(FloodEvent).filter(FloodEvent.id == event_id).first()
        if db_event:
            db.delete(db_event)
            db.commit()
            return True
        return False
    
    # Prediction CRUD
    @staticmethod
    def get_prediction(db: Session, prediction_id: int) -> Optional[Prediction]:
        return db.query(Prediction).filter(Prediction.id == prediction_id).first()
    
    @staticmethod
    def get_predictions(db: Session, user_id: int = None, skip: int = 0, limit: int = 100) -> List[Prediction]:
        query = db.query(Prediction)
        if user_id:
            query = query.filter(Prediction.user_id == user_id)
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def delete_prediction(db: Session, prediction_id: int, user_id: int) -> bool:
        db_prediction = db.query(Prediction).filter(
            Prediction.id == prediction_id,
            Prediction.user_id == user_id
        ).first()
        if db_prediction:
            db.delete(db_prediction)
            db.commit()
            return True
        return False
    
    # Recommendation CRUD
    @staticmethod
    def create_recommendation(db: Session, rec: RecommendationCreate) -> Recommendation:
        db_rec = Recommendation(**rec.dict())
        db.add(db_rec)
        db.commit()
        db.refresh(db_rec)
        return db_rec
    
    @staticmethod
    def get_recommendation(db: Session, rec_id: int) -> Optional[Recommendation]:
        return db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    
    @staticmethod
    def get_recommendations(db: Session, prediction_id: int = None, skip: int = 0, limit: int = 100) -> List[Recommendation]:
        query = db.query(Recommendation)
        if prediction_id:
            query = query.filter(Recommendation.prediction_id == prediction_id)
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update_recommendation(db: Session, rec_id: int, rec_data: Dict[str, Any]) -> Optional[Recommendation]:
        db_rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
        if db_rec:
            for field, value in rec_data.items():
                if hasattr(db_rec, field):
                    setattr(db_rec, field, value)
            db.commit()
            db.refresh(db_rec)
        return db_rec
    
    @staticmethod
    def delete_recommendation(db: Session, rec_id: int) -> bool:
        db_rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
        if db_rec:
            db.delete(db_rec)
            db.commit()
            return True
        return False
    
    # Feedback CRUD
    @staticmethod
    def get_feedback(db: Session, feedback_id: int) -> Optional[Feedback]:
        return db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    @staticmethod
    def get_feedbacks(db: Session, user_id: int = None, skip: int = 0, limit: int = 100) -> List[Feedback]:
        query = db.query(Feedback)
        if user_id:
            query = query.filter(Feedback.user_id == user_id)
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def update_feedback(db: Session, feedback_id: int, feedback_data: Dict[str, Any], user_id: int) -> Optional[Feedback]:
        db_feedback = db.query(Feedback).filter(
            Feedback.id == feedback_id,
            Feedback.user_id == user_id
        ).first()
        if db_feedback:
            for field, value in feedback_data.items():
                if hasattr(db_feedback, field):
                    setattr(db_feedback, field, value)
            db.commit()
            db.refresh(db_feedback)
        return db_feedback
    
    @staticmethod
    def delete_feedback(db: Session, feedback_id: int, user_id: int) -> bool:
        db_feedback = db.query(Feedback).filter(
            Feedback.id == feedback_id,
            Feedback.user_id == user_id
        ).first()
        if db_feedback:
            db.delete(db_feedback)
            db.commit()
            return True
        return False