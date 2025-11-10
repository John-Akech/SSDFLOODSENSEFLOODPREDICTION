# FloodSense - Heroku Deployment Guide

## Prerequisites

1. **Heroku Account**: Sign up at [heroku.com](https://www.heroku.com)
2. **Heroku CLI**: Install from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
3. **Git**: Ensure your repository is up to date
4. **Docker**: Heroku uses Docker for container deployments

## Quick Start Deployment

### 1. Install Heroku CLI

**Windows (PowerShell as Administrator):**
```powershell
# Download and run installer
winget install Heroku.HerokuCLI
```

Or download from: https://cli-assets.heroku.com/heroku-x64.exe

**Verify Installation:**
```powershell
heroku --version
```

### 2. Login to Heroku

```powershell
heroku login
```

This will open your browser for authentication.

### 3. Create Heroku App

```powershell
# Navigate to project directory
cd SSDFLOODSENSEFLOODPREDICTION

# Create app (replace 'floodsense-app' with your desired name)
heroku create floodsense-app

# Or use auto-generated name
heroku create
```

### 4. Set Stack to Container

```powershell
heroku stack:set container -a floodsense-app
```

### 5. Configure Environment Variables

```powershell
# Required variables
heroku config:set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))") -a floodsense-app
heroku config:set DATABASE_URL="sqlite:///./database/floodsense.db" -a floodsense-app
heroku config:set ENVIRONMENT=production -a floodsense-app

# CORS - Update with your actual Heroku domain
heroku config:set CORS_ORIGINS="https://floodsense-app.herokuapp.com" -a floodsense-app

# Google Earth Engine (if using SAR detection)
heroku config:set GEE_PROJECT_ID="your-gee-project-id" -a floodsense-app

# Optional: Web Push Notifications
heroku config:set VAPID_PUBLIC_KEY="your-vapid-public-key" -a floodsense-app
heroku config:set VAPID_PRIVATE_KEY="your-vapid-private-key" -a floodsense-app

# Security settings
heroku config:set MAX_LOGIN_ATTEMPTS=5 -a floodsense-app
heroku config:set RATE_LIMIT_REQUESTS=100 -a floodsense-app
```

### 6. Add PostgreSQL Database (Recommended for Production)

```powershell
# Add Heroku Postgres (free tier)
heroku addons:create heroku-postgresql:essential-0 -a floodsense-app

# This automatically sets DATABASE_URL
# Update your config to use it
heroku config:set DATABASE_URL=$(heroku config:get DATABASE_URL -a floodsense-app) -a floodsense-app
```

### 7. Deploy to Heroku

```powershell
# Add Heroku remote (if not added during creation)
heroku git:remote -a floodsense-app

# Push to Heroku (triggers build)
git push heroku master

# Or if you're on a different branch
git push heroku main:master
```

### 8. Scale Dynos

```powershell
# Scale web dyno
heroku ps:scale web=1 -a floodsense-app

# Check status
heroku ps -a floodsense-app
```

### 9. Open Your App

```powershell
heroku open -a floodsense-app
```

## Post-Deployment

### View Logs

```powershell
# Stream logs in real-time
heroku logs --tail -a floodsense-app

# View last 100 lines
heroku logs -n 100 -a floodsense-app
```

### Run Database Migrations

```powershell
# If you need to initialize the database
heroku run python -c "from app.database.database import init_db; init_db()" -a floodsense-app
```

### Restart App

```powershell
heroku restart -a floodsense-app
```

## PostgreSQL Setup (Production)

For production, use PostgreSQL instead of SQLite:

### 1. Add PostgreSQL Add-on

```powershell
heroku addons:create heroku-postgresql:essential-0 -a floodsense-app
```

### 2. Update DATABASE_URL

Heroku automatically sets `DATABASE_URL` when you add PostgreSQL. Update your backend to use it:

```powershell
# The DATABASE_URL is automatically set
heroku config -a floodsense-app | grep DATABASE_URL
```

### 3. Add PostGIS Extension (for GIS features)

```powershell
heroku pg:psql -a floodsense-app
# In the PostgreSQL prompt:
CREATE EXTENSION IF NOT EXISTS postgis;
\q
```

## Custom Domain Setup

### 1. Add Your Domain

```powershell
heroku domains:add www.floodsense.org -a floodsense-app
heroku domains:add floodsense.org -a floodsense-app
```

### 2. Get DNS Target

```powershell
heroku domains -a floodsense-app
```

### 3. Update DNS Records

Add a CNAME record in your domain registrar:
- **Type**: CNAME
- **Name**: www
- **Value**: [DNS target from Heroku]

### 4. Enable SSL

```powershell
heroku certs:auto:enable -a floodsense-app
```

### 5. Update CORS

```powershell
heroku config:set CORS_ORIGINS="https://www.floodsense.org,https://floodsense.org" -a floodsense-app
```

## Monitoring & Maintenance

### Check App Health

```powershell
heroku ps -a floodsense-app
heroku logs --tail -a floodsense-app
```

### Database Backup

```powershell
# Manual backup
heroku pg:backups:capture -a floodsense-app

# Schedule automatic backups
heroku pg:backups:schedule DATABASE_URL --at '02:00 America/New_York' -a floodsense-app

# List backups
heroku pg:backups -a floodsense-app
```

### Scale Resources

```powershell
# Upgrade dyno type
heroku ps:type web=standard-1x -a floodsense-app

# Add more dynos
heroku ps:scale web=2 -a floodsense-app
```

## Troubleshooting

### Build Fails

```powershell
# Check build logs
heroku logs --tail -a floodsense-app

# Rebuild
git commit --allow-empty -m "Trigger rebuild"
git push heroku master
```

### Application Crashes

```powershell
# Check logs
heroku logs --tail -a floodsense-app

# Check dyno status
heroku ps -a floodsense-app

# Restart
heroku restart -a floodsense-app
```

### Database Connection Issues

```powershell
# Check DATABASE_URL
heroku config:get DATABASE_URL -a floodsense-app

# Reset database (CAUTION: destroys all data)
heroku pg:reset DATABASE_URL -a floodsense-app --confirm floodsense-app
```

### Port Binding Issues

Heroku dynamically assigns the PORT variable. Ensure your app uses it:
```python
import os
port = int(os.environ.get("PORT", 8000))
```

## Cost Estimation

### Free Tier (Eco Dynos)
- **Web Dyno**: Free (550-1000 hours/month)
- **PostgreSQL**: Essential-0 ($5/month, 1GB)
- **Total**: ~$5/month

### Production Tier
- **Standard-1X Dyno**: $25/month per dyno
- **PostgreSQL Standard-0**: $50/month (10GB, 120 connections)
- **Total**: ~$75/month

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT secret key | Yes |
| `DATABASE_URL` | Database connection URL | Yes |
| `ENVIRONMENT` | Environment (production/development) | Yes |
| `CORS_ORIGINS` | Allowed CORS origins | Yes |
| `GEE_PROJECT_ID` | Google Earth Engine project ID | Optional |
| `VAPID_PUBLIC_KEY` | Web Push public key | Optional |
| `VAPID_PRIVATE_KEY` | Web Push private key | Optional |
| `MAX_LOGIN_ATTEMPTS` | Max login attempts | Optional |
| `RATE_LIMIT_REQUESTS` | Rate limit per window | Optional |

## Continuous Deployment

### Enable Auto-Deploy from GitHub

1. Go to Heroku Dashboard → Your App → Deploy
2. Connect to GitHub repository
3. Enable "Automatic Deploys" from master branch
4. Every push to master will auto-deploy

### Using GitHub Actions

Create `.github/workflows/heroku-deploy.yml`:
```yaml
name: Deploy to Heroku

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "floodsense-app"
          heroku_email: "your-email@example.com"
```

## Support & Resources

- **Heroku Dev Center**: https://devcenter.heroku.com/
- **Heroku Status**: https://status.heroku.com/
- **Pricing**: https://www.heroku.com/pricing
- **Support**: https://help.heroku.com/

## Quick Commands Reference

```powershell
# Login
heroku login

# Create app
heroku create floodsense-app

# Set config
heroku config:set KEY=VALUE -a floodsense-app

# Deploy
git push heroku master

# View logs
heroku logs --tail -a floodsense-app

# Restart
heroku restart -a floodsense-app

# Scale
heroku ps:scale web=1 -a floodsense-app

# Open app
heroku open -a floodsense-app

# Run commands
heroku run python manage.py -a floodsense-app

# Add database
heroku addons:create heroku-postgresql:essential-0 -a floodsense-app

# Database console
heroku pg:psql -a floodsense-app
```

---

**Ready to deploy!** Follow the steps above and your FloodSense application will be live on Heroku. 🚀
