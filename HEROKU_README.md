# 🚀 Quick Start: Deploy to Heroku

Deploy your FloodSense application to Heroku in 5 minutes!

## Prerequisites

- **Heroku Account**: [Sign up free](https://signup.heroku.com/)
- **Heroku CLI**: Install it first
- **Git**: Repository should be committed

## Installation

### Install Heroku CLI (Windows)

```powershell
# Using winget (recommended)
winget install Heroku.HerokuCLI

# Or download installer
# https://cli-assets.heroku.com/heroku-x64.exe
```

Verify installation:
```powershell
heroku --version
```

## Deployment Options

### Option 1: Quick Deploy (Easiest) ⚡

Run the automated script:

```powershell
.\quick-deploy.ps1
```

Follow the prompts:
1. Login to Heroku (browser opens)
2. Enter app name (or use auto-generated)
3. Choose PostgreSQL ($5/month) or SQLite (free)
4. Wait 5-10 minutes for deployment
5. Open app in browser!

### Option 2: Full Deploy (With Options) 🎛️

```powershell
# New app with PostgreSQL and custom domain
.\deploy-heroku.ps1 -AppName "floodsense-app" -CreateApp -AddPostgres -SetupDomain -Domain "yourdomain.com"

# Existing app, just deploy
.\deploy-heroku.ps1 -AppName "your-existing-app"
```

### Option 3: Manual Deploy (Step by Step) 📝

```powershell
# 1. Login
heroku login

# 2. Create app
heroku create your-app-name

# 3. Set container stack
heroku stack:set container -a your-app-name

# 4. Configure environment
heroku config:set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))") -a your-app-name
heroku config:set ENVIRONMENT=production -a your-app-name
heroku config:set CORS_ORIGINS="https://your-app-name.herokuapp.com" -a your-app-name

# 5. (Optional) Add PostgreSQL
heroku addons:create heroku-postgresql:essential-0 -a your-app-name

# 6. Deploy
git push heroku master

# 7. Scale
heroku ps:scale web=1 -a your-app-name

# 8. Open
heroku open -a your-app-name
```

## What Gets Deployed?

Your deployment includes:

- ✅ **Frontend**: React + TypeScript + Vite
- ✅ **Backend**: FastAPI + Python
- ✅ **Database**: PostgreSQL (optional) or SQLite
- ✅ **Nginx**: Reverse proxy for optimal performance
- ✅ **ML Models**: Flood prediction models included
- ✅ **SSL**: Automatic HTTPS with free SSL certificate

## Environment Variables

Automatically configured:

| Variable | Value | Description |
|----------|-------|-------------|
| `SECRET_KEY` | Auto-generated | JWT signing key |
| `DATABASE_URL` | Auto-set | Database connection |
| `ENVIRONMENT` | `production` | Environment mode |
| `CORS_ORIGINS` | Your domain | Allowed origins |
| `PORT` | Auto-assigned | Heroku port |

## Post-Deployment

### Check Status

```powershell
# View logs
heroku logs --tail -a your-app-name

# Check dynos
heroku ps -a your-app-name

# Open app
heroku open -a your-app-name
```

### Test Endpoints

- **Homepage**: `https://your-app-name.herokuapp.com`
- **API Health**: `https://your-app-name.herokuapp.com/health`
- **API Docs**: `https://your-app-name.herokuapp.com/docs`
- **Live Map**: `https://your-app-name.herokuapp.com/map`

## Troubleshooting

### Build Fails

```powershell
# View detailed logs
heroku logs --tail -a your-app-name

# Trigger rebuild
git commit --allow-empty -m "Rebuild"
git push heroku master
```

### App Crashes

```powershell
# Restart app
heroku restart -a your-app-name

# Check dyno status
heroku ps -a your-app-name
```

### Database Issues

```powershell
# Check database
heroku pg:info -a your-app-name

# Access database console
heroku pg:psql -a your-app-name
```

## Costs

### Free Tier (Eco)
- **Web Dyno**: Free (550-1000 hours/month)
- **Database**: Essential-0 ($5/month, 1GB)
- **Total**: **~$5/month**

### Starter Tier
- **Eco Dyno**: $5/month
- **Database**: Essential-0 ($5/month)
- **Total**: **~$10/month**

### Production Tier
- **Standard-1X**: $25/month
- **PostgreSQL**: Standard-0 ($50/month, 10GB)
- **Total**: **~$75/month**

## Custom Domain

Add your own domain:

```powershell
# Add domain
heroku domains:add yourdomain.com -a your-app-name
heroku domains:add www.yourdomain.com -a your-app-name

# Enable SSL (automatic, free)
heroku certs:auto:enable -a your-app-name

# Get DNS target
heroku domains -a your-app-name
```

Then update your DNS:
- **Type**: CNAME
- **Name**: www
- **Value**: [DNS target from Heroku]

## Scaling

### More Power

```powershell
# Upgrade dyno type
heroku ps:type web=standard-2x -a your-app-name
```

### More Dynos

```powershell
# Scale to 2 dynos
heroku ps:scale web=2 -a your-app-name
```

### Bigger Database

```powershell
# Upgrade to standard-0 (10GB)
heroku addons:upgrade DATABASE_URL heroku-postgresql:standard-0 -a your-app-name
```

## Continuous Deployment

### From GitHub

1. Go to [Heroku Dashboard](https://dashboard.heroku.com/)
2. Select your app
3. Click **Deploy** tab
4. Connect to GitHub repo
5. Enable **Automatic Deploys** from `master` branch

Now every push to `master` auto-deploys! 🎉

## Backup & Recovery

### Create Backup

```powershell
# Manual backup
heroku pg:backups:capture -a your-app-name

# Schedule daily backups
heroku pg:backups:schedule DATABASE_URL --at '02:00 America/New_York' -a your-app-name
```

### Restore Backup

```powershell
# Restore latest backup
heroku pg:backups:restore b001 DATABASE_URL -a your-app-name --confirm your-app-name
```

## Monitoring

### View Metrics

```powershell
# Application metrics
heroku metrics -a your-app-name

# Response time
heroku metrics:response_time -a your-app-name

# Memory usage
heroku metrics:memory -a your-app-name
```

### Add Logging

```powershell
# Install Papertrail (free tier)
heroku addons:create papertrail:choklad -a your-app-name

# Open logs dashboard
heroku addons:open papertrail -a your-app-name
```

## Documentation

- 📘 **Full Guide**: See `DEPLOY_HEROKU.md`
- ✅ **Checklist**: See `DEPLOYMENT_CHECKLIST.md`
- 🛠️ **Scripts**: `deploy-heroku.ps1` and `quick-deploy.ps1`

## Support

- **Heroku Docs**: https://devcenter.heroku.com/
- **Status**: https://status.heroku.com/
- **Support**: https://help.heroku.com/

## Quick Commands

```powershell
# Essential commands
heroku login                              # Login
heroku create your-app-name               # Create app
git push heroku master                    # Deploy
heroku logs --tail -a your-app-name       # View logs
heroku open -a your-app-name              # Open app
heroku restart -a your-app-name           # Restart
heroku ps -a your-app-name                # Check status
heroku config -a your-app-name            # View config
```

---

## 🎯 Ready to Deploy?

Choose your method:

1. **Fastest**: `.\quick-deploy.ps1` (5 minutes)
2. **Customized**: `.\deploy-heroku.ps1 -AppName "app" -CreateApp -AddPostgres`
3. **Manual**: Follow commands in `DEPLOY_HEROKU.md`

**Good luck with your presentation!** 🚀

---

*Built with ❤️ for South Sudan flood prediction*
