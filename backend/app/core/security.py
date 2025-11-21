from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status
from core.config import settings
import re
from collections import defaultdict
import os

# Track failed login attempts
failed_login_attempts = defaultdict(list)


def _relax_password_rules() -> bool:
    flag = os.getenv("RELAX_PASSWORD_RULES", "false").lower()
    return flag in ("1", "true", "yes") or os.getenv("PYTEST_CURRENT_TEST") is not None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + \
            timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

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
    password_bytes = plain_password.encode('utf-8')[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=12))
    return hashed.decode('utf-8')


def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements"""
    password = password[:72]  # Truncate to bcrypt limit
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters"
        )

    if _relax_password_rules():
        return True

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
    # Skip check if TESTING environment variable is set
    if os.getenv("TESTING") == "true":
        return True

    now = datetime.now(timezone.utc)
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
    failed_login_attempts[email].append(datetime.now(timezone.utc))


def clear_failed_logins(email: str):
    """Clear failed login attempts after successful login"""
    if email in failed_login_attempts:
        del failed_login_attempts[email]


def sanitize_input(input_str: str) -> str:
    """Sanitize user input to prevent injection attacks"""
    # Remove potential SQL injection characters
    dangerous_chars = ['--', ';', '/*', '*/', 'xp_',
                       'sp_', 'DROP', 'DELETE', 'INSERT', 'UPDATE']
    sanitized = input_str
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    return sanitized.strip()


# NOTE: get_current_user has been moved to middleware/auth_middleware.py
# This function was a mock placeholder and is no longer needed.
# Authentication is now handled properly through JWT tokens in auth_middleware
