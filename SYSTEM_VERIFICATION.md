# FloodSense System Verification

## API Routes & Endpoints Configuration

### Backend API (Port 8000)
**Base URL:** `/api/v1` (proxied through DigitalOcean ingress)

#### Health & Status
- `GET /health` - Simple health check for container orchestration
- `GET /api/v1/health` - Detailed system health (models, database, SAR service)
- `GET /` - Root endpoint with system information

#### Authentication Routes (`/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns JWT)
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user profile

#### Prediction Routes
- `POST /api/v1/predictions/predict` - Generate flood prediction
- `GET /api/v1/predictions/` - List all predictions
- `GET /api/v1/predictions/{id}` - Get specific prediction
- `POST /api/v1/predictions/batch` - Batch predictions

#### Alert Routes
- `GET /api/v1/alerts/` - List active alerts
- `POST /api/v1/alerts/` - Create new alert (admin)
- `GET /api/v1/alerts/{id}` - Get specific alert
- `DELETE /api/v1/alerts/{id}` - Delete alert (admin)

#### Push Notification Routes
- `POST /api/v1/subscriptions/` - Subscribe to web push
- `GET /api/v1/subscriptions/` - List user's subscriptions
- `DELETE /api/v1/subscriptions/{id}` - Unsubscribe
- `GET /api/v1/push/vapid-public-key` - Get VAPID public key

#### SMS Notification Routes (`/sms`)
- `POST /sms/subscribe` - Subscribe to SMS alerts
- `POST /sms/unsubscribe` - Unsubscribe from SMS alerts
- `GET /sms/status` - Get SMS subscription status
- `POST /sms/test` - Send test SMS (authenticated)

#### Admin Routes (`/admin`)
- `GET /admin/users` - List all users
- `GET /admin/stats` - System statistics
- `POST /admin/users/{id}/role` - Update user role

#### CRUD Routes
- `GET /api/v1/users` - List users
- `GET /api/v1/users/{id}` - Get user details
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

---

### SAR Detection Service (Port 8080)
**Base URL:** `/sar` (proxied through DigitalOcean ingress)

#### Core Endpoints
- `GET /health` - Health check
- `GET /` - Interactive map interface
- `GET /gee/status` - Google Earth Engine auth status
- `POST /gee/authenticate` - Initialize GEE authentication

#### Flood Detection
- `POST /flood_detect` - Run flood detection (saves to DB)
- `POST /flood_display` - Display flood detection as map tiles
- `GET /flood_download/{detection_id}` - Download geopackage by ID
- `GET /flood_detections` - List all detections (paginated)

#### Data Availability
- `GET /sentinel1/availability` - Check Sentinel-1 data availability

#### Feature Extraction
- `POST /extract-features` - Extract satellite features for ML prediction

---

## Service Communication Flow

```
Frontend (React)
    |
    ├─> Backend API (/api/v1)
    |       |
    |       ├─> Database (PostgreSQL)
    |       ├─> ML Models (Random Forest, TCN, GB)
    |       ├─> SAR Service (/sar) - for GEE features
    |       ├─> SMS Service (Twilio/Africa's Talking)
    |       └─> Email Service (SMTP)
    |
    └─> SAR Service (/sar)
            |
            ├─> Google Earth Engine API
            └─> Database (PostgreSQL)
```

---

## Environment Variables

### Backend Required
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing key
- `SAR_SERVICE_URL` - SAR service URL (default: http://sar-detection:8080)
- `GEE_SERVICE_URL` - Alias for SAR service URL

### Backend Optional
- `VAPID_PUBLIC_KEY` - Web Push public key
- `VAPID_PRIVATE_KEY` - Web Push private key
- `VAPID_SUBJECT` - Web Push subject (mailto:)
- `TWILIO_ACCOUNT_SID` - Twilio SMS credentials
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `AFRICASTALKING_USERNAME` - Africa's Talking credentials
- `AFRICASTALKING_API_KEY`
- `CORS_ORIGINS` - Allowed CORS origins
- `ALLOWED_HOSTS` - Allowed hosts for security

### SAR Service Required
- `DATABASE_URL` - PostgreSQL connection string
- `GEE_PROJECT_ID` - Google Earth Engine project ID
- `GEE_SERVICE_ACCOUNT_KEY_BASE64` - Base64-encoded GEE service account JSON

### Frontend Required
- `VITE_API_URL` - Backend API URL (default: /api/v1)
- `VITE_SAR_URL` - SAR service URL (default: /sar)
- `VITE_VAPID_PUBLIC_KEY` - VAPID public key for web push

---

## Health Check Endpoints

### Quick Health Check
```bash
# Backend
curl http://localhost:8000/health
# Expected: {"status": "healthy", "models_loaded": true}

# SAR Service
curl http://localhost:8080/health
# Expected: {"status": "healthy", "service": "FloodSense SAR Detection"}
```

### Detailed Health Check
```bash
# Backend with full system status
curl http://localhost:8000/api/v1/health
# Returns: models status, database connection, SAR service availability
```

---

## API Documentation

### Interactive Documentation
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI Schema:** http://localhost:8000/openapi.json

### SAR Service Documentation
- **Swagger UI:** http://localhost:8080/docs
- **ReDoc:** http://localhost:8080/redoc

---

## Testing Connectivity

### Backend to SAR Service
The backend automatically checks SAR service connectivity during health checks:
- Falls back through: `GEE_SERVICE_URL` → `SAR_SERVICE_URL` → `http://sar-detection:8080`
- Feature extraction endpoint: `/extract-features`
- Caches features for 30 minutes per location

### Frontend to Backend
- API calls use relative paths in production: `/api/v1`
- Proxied through DigitalOcean ingress

### Frontend to SAR Service
- API calls use relative paths in production: `/sar`
- Proxied through DigitalOcean ingress

---

## Automated Alert System

### Scheduler Configuration
- Runs every 6 hours automatically
- Monitors 8 high-risk locations in South Sudan
- Multi-channel delivery:
  1. Web Push notifications
  2. SMS alerts (for users with phone numbers)
  3. Email notifications (for users with email)

### Monitored Locations
1. Bor (Jonglei)
2. Pibor (Jonglei)
3. Bentiu (Unity)
4. Malakal (Upper Nile)
5. Akobo (Jonglei)
6. Renk (Upper Nile)
7. Old Fangak (Jonglei)
8. Canal/Pigi County (Jonglei)

---

## Database Schema

### Core Tables
- `users` - User accounts with authentication
- `predictions` - Flood prediction history
- `alerts` - Active flood alerts
- `push_subscriptions` - Web push notification subscriptions
- `sar_flood_detections` - SAR-based flood detection results
- `system_logs` - Audit logs for system events

### User Notification Preferences
- `phone_number` - Phone number for SMS alerts
- `sms_alerts_enabled` - SMS notification opt-in
- `email_alerts_enabled` - Email notification opt-in

---

## Security Features

### Middleware Stack (Execution Order)
1. Rate Limiting (100 requests/hour)
2. Trusted Host validation
3. IP Whitelist (optional)
4. Request Logging
5. Security Headers (CSP, X-Frame-Options, etc.)
6. CORS (must be last)

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration: 30 minutes
- Automatic token refresh on valid requests

---

## Deployment Verification Checklist

- [ ] Backend health check returns 200 OK
- [ ] SAR service health check returns 200 OK
- [ ] Frontend loads and displays map
- [ ] User registration and login works
- [ ] Flood prediction generates results
- [ ] SAR detection service accessible
- [ ] Google Earth Engine authenticated
- [ ] Web push notifications configured
- [ ] SMS service configured (if enabled)
- [ ] Database migrations applied
- [ ] ML models loaded successfully
- [ ] Automated alert scheduler running

---

## Common Issues & Solutions

### Issue: "Models not loaded"
**Solution:** Check that model files exist in `/app/models/` directory

### Issue: "SAR service unavailable"
**Solution:** Verify GEE_SERVICE_URL or SAR_SERVICE_URL environment variable

### Issue: "GEE authentication failed"
**Solution:** Check GEE_SERVICE_ACCOUNT_KEY_BASE64 is properly set and base64-encoded

### Issue: "CORS errors"
**Solution:** Verify CORS_ORIGINS includes frontend URL

### Issue: "Database connection failed"
**Solution:** Verify DATABASE_URL format and database is running

---

## Performance Metrics

### Expected Response Times
- Health check: < 100ms
- Authentication: < 200ms
- Prediction (single): < 500ms
- Prediction (with GEE features): < 3s
- SAR detection: 30-120s (depends on area size)

### Resource Usage
- Backend memory: ~512MB (with models loaded)
- SAR service memory: ~1GB (GEE processing)
- Database: Minimal (< 100MB for typical usage)

---

**Last Updated:** December 2, 2025
**Status:** Production Ready
**Version:** 2.0.0
