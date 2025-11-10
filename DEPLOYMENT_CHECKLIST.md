# FloodSense Heroku Deployment Checklist

## Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Heroku CLI installed (`winget install Heroku.HerokuCLI`)
- [ ] Logged into Heroku (`heroku login`)
- [ ] Git repository is up to date (`git status`)
- [ ] All changes committed (`git commit -am "Prepare for Heroku deployment"`)
- [ ] Docker installed (for local testing)

### 2. Environment Variables Prepared
- [ ] `SECRET_KEY` - Generate secure key
- [ ] `DATABASE_URL` - Will be auto-set by Heroku Postgres
- [ ] `CORS_ORIGINS` - Update with Heroku domain
- [ ] `GEE_PROJECT_ID` - Google Earth Engine project (if using SAR)
- [ ] `ENVIRONMENT` - Set to `production`

### 3. Configuration Files
- [ ] `heroku.yml` - Heroku build configuration
- [ ] `Dockerfile.heroku` - Multi-stage Docker build
- [ ] `start-heroku.sh` - Startup script (executable)
- [ ] `heroku-nginx.conf` - Nginx reverse proxy config
- [ ] `.slugignore` - Files to exclude from slug

## Deployment Steps

### Step 1: Install Heroku CLI
```powershell
# Windows
winget install Heroku.HerokuCLI

# Or download from:
# https://cli-assets.heroku.com/heroku-x64.exe
```

### Step 2: Login to Heroku
```powershell
heroku login
# Opens browser for authentication
```

### Step 3: Quick Deploy (Using Automation Script)
```powershell
# Option A: New app with PostgreSQL
.\deploy-heroku.ps1 -AppName "floodsense-app" -CreateApp -AddPostgres

# Option B: Existing app
.\deploy-heroku.ps1 -AppName "your-existing-app-name"

# Option C: With custom domain
.\deploy-heroku.ps1 -AppName "floodsense-app" -CreateApp -AddPostgres -SetupDomain -Domain "floodsense.org"
```

### Step 4: Manual Deploy (If automation fails)

#### 4.1 Create Heroku App
```powershell
heroku create floodsense-app
# Or for auto-generated name:
# heroku create
```

#### 4.2 Set Stack to Container
```powershell
heroku stack:set container -a floodsense-app
```

#### 4.3 Configure Environment Variables
```powershell
# Generate and set SECRET_KEY
$secretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
heroku config:set SECRET_KEY=$secretKey -a floodsense-app

# Set other variables
heroku config:set ENVIRONMENT=production -a floodsense-app
heroku config:set CORS_ORIGINS="https://floodsense-app.herokuapp.com" -a floodsense-app
heroku config:set MAX_LOGIN_ATTEMPTS=5 -a floodsense-app
heroku config:set RATE_LIMIT_REQUESTS=100 -a floodsense-app
```

#### 4.4 Add PostgreSQL (Optional but Recommended)
```powershell
# Free tier (up to 10,000 rows)
heroku addons:create heroku-postgresql:essential-0 -a floodsense-app

# Wait for provisioning
heroku pg:wait -a floodsense-app

# Enable PostGIS for geospatial features
heroku pg:psql -a floodsense-app
# In PostgreSQL prompt:
# CREATE EXTENSION IF NOT EXISTS postgis;
# \q
```

#### 4.5 Deploy to Heroku
```powershell
# Add Heroku remote (if not added)
heroku git:remote -a floodsense-app

# Push and deploy (this will take 5-10 minutes)
git push heroku master

# Or from a different branch:
# git push heroku your-branch:master
```

#### 4.6 Scale Web Dyno
```powershell
heroku ps:scale web=1 -a floodsense-app
```

### Step 5: Verify Deployment
```powershell
# Check logs
heroku logs --tail -a floodsense-app

# Check dyno status
heroku ps -a floodsense-app

# Open app
heroku open -a floodsense-app
```

## Post-Deployment Verification

### Health Checks
- [ ] App URL loads: `https://floodsense-app.herokuapp.com`
- [ ] Health endpoint: `https://floodsense-app.herokuapp.com/health`
- [ ] API docs: `https://floodsense-app.herokuapp.com/docs`
- [ ] Frontend loads correctly
- [ ] Login/authentication works
- [ ] API endpoints respond correctly

### Database Verification
```powershell
# Check database connection
heroku pg:info -a floodsense-app

# View database credentials
heroku config:get DATABASE_URL -a floodsense-app

# Run database queries
heroku pg:psql -a floodsense-app
# SELECT COUNT(*) FROM alerts;
# \q
```

### Logs Monitoring
```powershell
# Real-time logs
heroku logs --tail -a floodsense-app

# Filter by source
heroku logs --source app --tail -a floodsense-app

# Last 100 lines
heroku logs -n 100 -a floodsense-app
```

## Troubleshooting

### Build Fails
**Issue**: Docker build fails
```powershell
# Check build logs
heroku logs --tail -a floodsense-app

# Common fixes:
# 1. Ensure Dockerfile.heroku exists
# 2. Check heroku.yml configuration
# 3. Verify all COPY paths are correct

# Force rebuild
git commit --allow-empty -m "Trigger Heroku rebuild"
git push heroku master
```

### App Crashes on Startup
**Issue**: App crashes with H10 error
```powershell
# View crash logs
heroku logs --tail -a floodsense-app

# Common fixes:
# 1. Check PORT binding in start-heroku.sh
# 2. Verify DATABASE_URL is set
# 3. Check SECRET_KEY is configured

# Restart app
heroku restart -a floodsense-app
```

### Database Connection Errors
**Issue**: Cannot connect to database
```powershell
# Verify DATABASE_URL
heroku config:get DATABASE_URL -a floodsense-app

# Reset database (CAUTION: destroys data!)
heroku pg:reset DATABASE_URL -a floodsense-app --confirm floodsense-app

# Re-initialize
heroku run python -c "from app.database.database import init_db; init_db()" -a floodsense-app
```

### Frontend Not Loading
**Issue**: 404 errors or blank page
```powershell
# Check if frontend build succeeded
heroku logs --tail -a floodsense-app | grep "frontend"

# Verify nginx is running
heroku run bash -a floodsense-app
# ps aux | grep nginx
# ls -la /usr/share/nginx/html
# exit
```

### CORS Errors
**Issue**: CORS policy blocks requests
```powershell
# Update CORS_ORIGINS
heroku config:set CORS_ORIGINS="https://floodsense-app.herokuapp.com,https://www.floodsense-app.herokuapp.com" -a floodsense-app

# Restart
heroku restart -a floodsense-app
```

## Custom Domain Setup

### 1. Add Domain to Heroku
```powershell
heroku domains:add floodsense.org -a floodsense-app
heroku domains:add www.floodsense.org -a floodsense-app
```

### 2. Get DNS Target
```powershell
heroku domains -a floodsense-app
# Copy the DNS Target shown
```

### 3. Configure DNS
Add these records to your domain registrar:

**For root domain (floodsense.org):**
- Type: `ALIAS` or `ANAME` or `CNAME`
- Name: `@` or leave blank
- Value: [DNS Target from Heroku]

**For www subdomain:**
- Type: `CNAME`
- Name: `www`
- Value: [DNS Target from Heroku]

### 4. Enable SSL
```powershell
heroku certs:auto:enable -a floodsense-app
```

### 5. Update CORS
```powershell
heroku config:set CORS_ORIGINS="https://floodsense.org,https://www.floodsense.org,https://floodsense-app.herokuapp.com" -a floodsense-app
```

### 6. Verify SSL Certificate
```powershell
heroku certs:info -a floodsense-app
```

Wait 15-60 minutes for DNS propagation.

## Scaling & Performance

### Upgrade Dyno Type
```powershell
# From free/eco to standard-1x
heroku ps:type web=standard-1x -a floodsense-app

# To standard-2x (more memory)
heroku ps:type web=standard-2x -a floodsense-app
```

### Scale Dyno Count
```powershell
# Add more dynos (requires paid plan)
heroku ps:scale web=2 -a floodsense-app
```

### Upgrade Database
```powershell
# View current plan
heroku pg:info -a floodsense-app

# Upgrade to standard-0 (50GB, $50/month)
heroku addons:upgrade DATABASE_URL heroku-postgresql:standard-0 -a floodsense-app
```

### Enable Autoscaling (Paid Feature)
```powershell
# Install autoscaling addon
heroku addons:create heroku-autoscaling:standard -a floodsense-app

# Configure
heroku autoscaling:enable -a floodsense-app
heroku autoscaling:set min=1 max=5 -a floodsense-app
```

## Monitoring

### Application Metrics
```powershell
# View metrics dashboard
heroku metrics -a floodsense-app

# Response time
heroku metrics:response_time -a floodsense-app

# Memory usage
heroku metrics:memory -a floodsense-app
```

### Database Monitoring
```powershell
# Database metrics
heroku pg:info -a floodsense-app

# Active connections
heroku pg:ps -a floodsense-app

# Database size
heroku pg:credentials:url DATABASE_URL -a floodsense-app
```

### Logging & Alerts
```powershell
# Add logging addon
heroku addons:create papertrail:choklad -a floodsense-app

# View in browser
heroku addons:open papertrail -a floodsense-app
```

## Backup & Recovery

### Manual Database Backup
```powershell
# Create backup
heroku pg:backups:capture -a floodsense-app

# List backups
heroku pg:backups -a floodsense-app

# Download backup
heroku pg:backups:download -a floodsense-app
```

### Schedule Automatic Backups
```powershell
# Daily at 2 AM EST
heroku pg:backups:schedule DATABASE_URL --at '02:00 America/New_York' -a floodsense-app

# View schedule
heroku pg:backups:schedules -a floodsense-app
```

### Restore from Backup
```powershell
# Restore from latest backup
heroku pg:backups:restore b001 DATABASE_URL -a floodsense-app --confirm floodsense-app

# Restore from URL
heroku pg:backups:restore 'https://s3.amazonaws.com/...' DATABASE_URL -a floodsense-app
```

## Cost Estimation

### Free Tier (Eco Dynos)
- Web Dyno: Free (550-1000 hours/month)
- PostgreSQL: Essential-0 ($5/month)
- **Total**: ~$5/month

### Starter Tier
- Eco Dyno: $5/month per dyno
- PostgreSQL: Essential-0 ($5/month)
- **Total**: ~$10/month

### Production Tier
- Standard-1X Dyno: $25/month per dyno
- PostgreSQL: Standard-0 ($50/month, 10GB)
- Custom Domain: Free
- SSL: Free (auto)
- **Total**: ~$75-100/month

### Enterprise Tier
- Performance-M Dyno: $250/month
- PostgreSQL: Premium-0 ($200/month, 50GB)
- Advanced monitoring: $50/month
- **Total**: ~$500+/month

## Useful Commands

```powershell
# Application Management
heroku apps:info -a floodsense-app        # App info
heroku open -a floodsense-app             # Open in browser
heroku restart -a floodsense-app          # Restart app
heroku ps -a floodsense-app               # Check dynos
heroku logs --tail -a floodsense-app      # View logs

# Configuration
heroku config -a floodsense-app           # List all config
heroku config:set KEY=VALUE -a floodsense-app  # Set variable
heroku config:unset KEY -a floodsense-app # Remove variable

# Database
heroku pg:info -a floodsense-app          # Database info
heroku pg:psql -a floodsense-app          # Database console
heroku pg:backups -a floodsense-app       # List backups
heroku pg:reset DATABASE_URL -a floodsense-app --confirm floodsense-app  # Reset DB

# Deployment
git push heroku master                     # Deploy
heroku releases -a floodsense-app         # View releases
heroku rollback -a floodsense-app         # Rollback to previous

# Scaling
heroku ps:scale web=2 -a floodsense-app   # Scale to 2 dynos
heroku ps:type web=standard-2x -a floodsense-app  # Change dyno type

# Domains
heroku domains -a floodsense-app          # List domains
heroku domains:add example.com -a floodsense-app  # Add domain
heroku certs:auto:enable -a floodsense-app # Enable SSL

# Run Commands
heroku run bash -a floodsense-app         # SSH into dyno
heroku run python manage.py -a floodsense-app  # Run Python script
```

## Support Resources

- **Heroku Dev Center**: https://devcenter.heroku.com/
- **Status Page**: https://status.heroku.com/
- **Support**: https://help.heroku.com/
- **Pricing**: https://www.heroku.com/pricing
- **Dashboard**: https://dashboard.heroku.com/

---

✅ **Deployment Complete!** Your FloodSense application is now live on Heroku.
