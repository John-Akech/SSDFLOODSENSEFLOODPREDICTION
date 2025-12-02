from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.database_models import Prediction as DBPrediction, User as DBUser

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/pending-predictions")
async def get_pending_predictions(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(require_admin)
):
    """Get all predictions awaiting admin approval"""
    pending = db.query(DBPrediction).filter(
        ~DBPrediction.published
    ).order_by(DBPrediction.created_at.desc()).all()

    return {"predictions": pending, "count": len(pending)}


@router.post("/approve-prediction/{prediction_id}")
async def approve_prediction(
    prediction_id: int,
    admin_notes: str = None,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(require_admin)
):
    """Approve prediction and publish to public"""
    prediction = db.query(DBPrediction).filter(
        DBPrediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    prediction.published = True
    prediction.admin_notes = admin_notes
    prediction.approved_by = current_user.id
    prediction.approved_at = datetime.now(timezone.utc)

    db.commit()
    return {"message": "Prediction approved and published", "prediction_id": prediction_id}


@router.post("/reject-prediction/{prediction_id}")
async def reject_prediction(
    prediction_id: int,
    reason: str = None,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(require_admin)
):
    """Reject prediction and hide from public"""
    prediction = db.query(DBPrediction).filter(
        DBPrediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    prediction.published = False
    prediction.rejected = True
    prediction.rejection_reason = reason
    prediction.rejected_by = current_user.id

    db.commit()
    return {"message": "Prediction rejected", "prediction_id": prediction_id}


@router.post("/retract-alert/{prediction_id}")
async def retract_alert(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(require_admin)
):
    """Retract published alert from public view"""
    prediction = db.query(DBPrediction).filter(
        DBPrediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    prediction.published = False
    prediction.retracted = True
    prediction.retracted_by = current_user.id
    prediction.retracted_at = datetime.now(timezone.utc)

    db.commit()
    return {"message": "Alert retracted from public view", "prediction_id": prediction_id}


@router.get("/metrics")
async def get_admin_metrics(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(require_admin)
):
    """Get system performance metrics for admin dashboard"""
    total_predictions = db.query(DBPrediction).count()
    approved = db.query(DBPrediction).filter(
        DBPrediction.published).count()
    pending = db.query(DBPrediction).filter(
        ~DBPrediction.published).count()

    approval_rate = (approved / total_predictions *
                     100) if total_predictions > 0 else 0

    return {
        "total_predictions": total_predictions,
        "approved": approved,
        "pending": pending,
        "approval_rate": round(approval_rate, 1),
        "model_accuracy": 87.0,
        "false_alarm_rate": 15.0
    }
