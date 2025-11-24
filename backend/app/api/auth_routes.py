from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import (
    create_access_token, verify_password, get_password_hash,
    validate_password_strength, check_login_attempts,
    record_failed_login, clear_failed_logins, sanitize_input
)
from app.schemas.schemas import UserCreate, User, Token, UserLogin
from app.models.database_models import User as DBUser
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=User, status_code=status.HTTP_200_OK)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with security validation"""
    # Sanitize email input
    email = sanitize_input(user_data.email.lower())

    # Truncate password to bcrypt limit
    user_data.password = user_data.password[:72]

    # Validate password strength
    validate_password_strength(user_data.password)

    # Check if email exists
    existing = db.query(DBUser).filter(DBUser.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = DBUser(
        email=email,
        hashed_password=get_password_hash(user_data.password),
        full_name=sanitize_input(user_data.full_name),
        role=user_data.role,
        language=user_data.language,
        contact_info=user_data.contact_info
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    credentials: Optional[UserLogin] = Body(None),
    db: Session = Depends(get_db)
):
    """Login user with rate limiting and attempt tracking"""
    login_payload = credentials
    if login_payload is None:
        query_email = request.query_params.get("email")
        query_password = request.query_params.get("password")
        if not query_email or not query_password:
            raise HTTPException(
                status_code=422, detail="Email and password required")
        login_payload = UserLogin(email=query_email, password=query_password)

    email = sanitize_input(login_payload.email.lower())

    # Check login attempts
    check_login_attempts(email)

    # Verify credentials
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if not user or not verify_password(login_payload.password, user.hashed_password):
        record_failed_login(email)
        raise HTTPException(
            status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    # Clear failed attempts on successful login
    clear_failed_logins(email)

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: DBUser = Depends(get_current_user)):
    """Get current user information"""
    return current_user
