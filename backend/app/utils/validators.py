import re
from typing import Optional
from fastapi import HTTPException, status


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """Validate latitude and longitude coordinates"""
    if not (-90 <= latitude <= 90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude must be between -90 and 90 degrees"
        )
    
    if not (-180 <= longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude must be between -180 and 180 degrees"
        )
    
    return True


def validate_south_sudan_coordinates(latitude: float, longitude: float) -> bool:
    """Validate coordinates are within South Sudan boundaries (approximate)"""
    # South Sudan approximate boundaries
    min_lat, max_lat = 3.0, 13.0
    min_lon, max_lon = 24.0, 36.0
    
    if not (min_lat <= latitude <= max_lat):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Latitude {latitude} is outside South Sudan boundaries ({min_lat}-{max_lat})"
        )
    
    if not (min_lon <= longitude <= max_lon):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Longitude {longitude} is outside South Sudan boundaries ({min_lon}-{max_lon})"
        )
    
    return True


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    return True


def validate_password(password: str) -> bool:
    """Validate password strength"""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    if not re.search(r'[A-Za-z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter"
        )
    
    if not re.search(r'\d', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number"
        )
    
    return True


def validate_phone_number(phone: Optional[str]) -> bool:
    """Validate phone number format (South Sudan format)"""
    if phone is None:
        return True
    
    # South Sudan phone numbers: +211 followed by 9 digits
    pattern = r'^\+211\d{9}$'
    if not re.match(pattern, phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number must be in format +211XXXXXXXXX"
        )
    
    return True


def validate_flood_probability(probability: float) -> bool:
    """Validate flood probability is between 0 and 1"""
    if not (0 <= probability <= 1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Flood probability must be between 0 and 1"
        )
    return True


def validate_lead_time(hours: int) -> bool:
    """Validate lead time is reasonable"""
    if not (1 <= hours <= 168):  # 1 hour to 1 week
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead time must be between 1 and 168 hours (1 week)"
        )
    return True


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize text input to prevent XSS and other attacks"""
    if not text:
        return ""
    
    # Remove potentially dangerous characters
    text = re.sub(r'[<>"\']', '', text)
    
    # Limit length
    if len(text) > max_length:
        text = text[:max_length]
    
    # Strip whitespace
    text = text.strip()
    
    return text