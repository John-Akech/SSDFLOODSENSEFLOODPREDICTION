from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from core.config import settings
import re
from collections import defaultdict

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Track failed login attempts
failed_login_attempts = defaultdict(list)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements"""
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters"
        )
    
    if settings.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter"
        )
    
    if settings.REQUIRE_NUMBER and not re.search(r'\d', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number"
        )
    
    if settings.REQUIRE_SPECIAL_CHAR and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character"
        )
    
    return True


def check_login_attempts(email: str) -> bool:
    """Check if user has exceeded login attempts"""
    now = datetime.utcnow()
    attempts = failed_login_attempts[email]
    
    # Remove old attempts
    failed_login_attempts[email] = [
        attempt for attempt in attempts
        if now - attempt < timedelta(seconds=settings.LOGIN_ATTEMPT_WINDOW)
    ]
    
    if len(failed_login_attempts[email]) >= settings.MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later."
        )
    
    return True


def record_failed_login(email: str):
    """Record a failed login attempt"""
    failed_login_attempts[email].append(datetime.utcnow())


def clear_failed_logins(email: str):
    """Clear failed login attempts after successful login"""
    if email in failed_login_attempts:
        del failed_login_attempts[email]


def sanitize_input(input_str: str) -> str:
    """Sanitize user input to prevent injection attacks"""
    # Remove potential SQL injection characters
    dangerous_chars = ['--', ';', '/*', '*/', 'xp_', 'sp_', 'DROP', 'DELETE', 'INSERT', 'UPDATE']
    sanitized = input_str
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    return sanitized.strip()


def get_current_user(token: str):
    """Placeholder for getting current user from token"""
    from schemas.schemas import User, UserRole
    # In production, decode token and fetch user from database
    # For now, return a mock admin user
    return User(
        id=1,
        email="admin@floodsense.org",
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True,
        created_at=datetime.utcnow()
    )
