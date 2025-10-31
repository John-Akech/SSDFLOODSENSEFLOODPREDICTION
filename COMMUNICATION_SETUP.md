# FloodSense Communication Setup Guide

This guide ensures all components (Frontend, Backend, Admin Dashboard, Database) communicate properly.

## Components Verified

### 1. **Database ↔ Backend**
- Backend connects to PostgreSQL via `DATABASE_URL`
- SQLAlchemy ORM handles all database operations
- Connection pooling configured for performance
- SSL encryption enabled for secure connections

### 2. **Frontend ↔ Backend**
- Frontend API service (`frontend/src/services/api.ts`) configured
- API base URL: `http://localhost:8000/api/v1` (development)
- CORS configured to allow frontend origins
- Authentication via JWT tokens stored in localStorage

### 3. **Admin Dashboard ↔ Database**
- Admin dashboard uses same API endpoints as frontend
- CRUD operations via `/api/v1/users`, `/api/v1/alerts`, `/api/v1/predictions`
- Admin endpoints protected with `require_admin` middleware
- Database access through backend API (no direct DB access)

### 4. **Nginx Proxy**
- Frontend served on port 80
- `/api` requests proxied to `backend:8000`
- `/sar` requests proxied to `sar-detection:8080`
- Proper CORS headers forwarded

## Configuration Files

### Backend CORS Configuration
**File**: `backend/app/main.py` and `backend/app/core/config.py`

```python
CORS_ORIGINS = [
    "http://localhost:3000",      # Vite dev server
    "http://localhost:5173",      # Vite alternate port
    "http://localhost:80",        # Production frontend
    "http://localhost",           # Localhost
    "https://floodsense.org",     # Production domain
    "https://www.floodsense.org"  # Production www
]
```

### Frontend API Configuration
**File**: `frontend/src/services/api.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
```

### Docker Network Configuration
**File**: `docker-compose.prod.yml`

- All services on `floodsense-network`
- Backend can reach PostgreSQL via `postgres:5432`
- Frontend can reach Backend via `http://backend:8000` (internal)
- External access via port 80 (frontend) and 8000 (backend API)

## Testing Connections

### Run Connection Test Script

```bash
# From project root
cd backend
python scripts/test_connections.py
```

This will test:
- Database connectivity
- API endpoint accessibility
- CORS configuration
- Admin dashboard database access

### Manual Testing

#### 1. Test Database Connection
```bash
# Via Docker
docker exec -it floodsense-backend python -c "from app.core.database import engine; print(engine.connect())"

# Check if tables exist
docker exec -it floodsense-postgres psql -U floodsense_user -d floodsense -c "\dt"
```

#### 2. Test API Endpoints
```bash
# Health check
curl http://localhost:8000/health

# Get predictions (should return JSON)
curl http://localhost:8000/api/v1/predictions

# Test CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:8000/api/v1/users -v
```

#### 3. Test Frontend Connection
```bash
# Start frontend
cd frontend
npm run dev

# In browser console, test API:
fetch('http://localhost:8000/api/v1/health')
  .then(r => r.json())
  .then(console.log)
```

#### 4. Test Admin Dashboard
```bash
# Login to admin dashboard
# Navigate to http://localhost:3000/admin (or http://localhost/admin)
# Check browser console for API calls
# Verify data loads from database
```

## Troubleshooting

### Issue: CORS Errors in Browser

**Symptoms**: 
- `Access to fetch has been blocked by CORS policy`
- `No 'Access-Control-Allow-Origin' header`

**Solution**:
1. Check `CORS_ORIGINS` in `.env` includes your frontend URL
2. Verify backend is using `settings.CORS_ORIGINS`
3. Restart backend after changing CORS settings
4. Clear browser cache

### Issue: Database Connection Failed

**Symptoms**:
- `sqlalchemy.exc.OperationalError: could not connect to server`
- `Connection refused`

**Solution**:
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify `DATABASE_URL` in `.env` is correct
3. Check network: `docker network inspect floodsense-network`
4. Verify PostgreSQL port is accessible from backend container

### Issue: Admin Dashboard Can't Load Data

**Symptoms**:
- Dashboard shows "Loading..." indefinitely
- Browser console shows 401/403 errors

**Solution**:
1. Verify user is logged in and has admin role
2. Check JWT token in localStorage: `localStorage.getItem('token')`
3. Verify admin endpoints are accessible: `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/admin/pending-predictions`
4. Check backend logs: `docker logs floodsense-backend`

### Issue: Frontend Can't Reach Backend

**Symptoms**:
- `Network Error` or `Failed to fetch`
- API calls timeout

**Solution**:
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check nginx configuration if using Docker
3. Verify API_BASE_URL in frontend matches backend URL
4. Check firewall rules if on production server

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│  (React + Vite) │
│   Port: 3000    │
└────────┬────────┘
         │ HTTP/REST
         │ (with JWT auth)
         ▼
┌─────────────────┐         ┌──────────────────┐
│   Nginx Proxy   │────────▶│   Backend API    │
│   Port: 80      │         │  (FastAPI)       │
└─────────────────┘         │  Port: 8000      │
                            └────────┬─────────┘
                                     │ SQLAlchemy
                                     │ (SSL encrypted)
                                     ▼
                            ┌──────────────────┐
                            │   PostgreSQL     │
                            │   Port: 5432     │
                            │  (Internal only) │
                            └──────────────────┘

┌─────────────────┐
│ Admin Dashboard │──┐
│ (Same Frontend) │  │ Uses same API endpoints
└─────────────────┘  │ with admin authentication
                     │
                     ▼
            ┌──────────────────┐
            │   Backend API    │───▶ Admin endpoints protected
            │   /api/v1/admin  │    by require_admin middleware
            └──────────────────┘
```

## Verification Checklist

Before deploying to production:

- [ ] Database connection works (`test_connections.py` passes)
- [ ] Frontend can make API calls (check browser console)
- [ ] Admin dashboard loads data (users, alerts, predictions)
- [ ] CORS configured for production domain
- [ ] Authentication working (login/logout)
- [ ] All API endpoints accessible
- [ ] Error handling works (network errors, auth errors)
- [ ] Database queries execute correctly
- [ ] Admin can create/edit/delete users
- [ ] Admin can manage alerts and predictions

## Quick Start

1. **Start all services**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Verify connections**:
   ```bash
   python backend/scripts/test_connections.py
   ```

3. **Access components**:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - Admin Dashboard: http://localhost/admin
   - API Docs: http://localhost:8000/docs

---

**Last Updated**: January 2025  
**Status**: All communication paths verified

