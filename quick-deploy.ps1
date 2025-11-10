#!/usr/bin/env pwsh
# FloodSense - Quick Deploy to Heroku
# Usage: .\quick-deploy.ps1

Write-Host @"
╔════════════════════════════════════════════════╗
║   FloodSense - Heroku Quick Deploy             ║
║   Deploy your flood prediction system now!     ║
╚════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Check Heroku CLI
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $version = heroku --version 2>&1
    Write-Host "✓ Heroku CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Heroku CLI not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Heroku CLI:" -ForegroundColor Yellow
    Write-Host "  Windows: winget install Heroku.HerokuCLI" -ForegroundColor White
    Write-Host "  Or download: https://cli-assets.heroku.com/heroku-x64.exe" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if logged in
try {
    $email = heroku auth:whoami 2>&1
    if ($email -match "@") {
        Write-Host "✓ Logged in as: $email" -ForegroundColor Green
    } else {
        Write-Host "✗ Not logged in to Heroku" -ForegroundColor Yellow
        Write-Host "Logging in..." -ForegroundColor Yellow
        heroku login
    }
} catch {
    Write-Host "Logging in to Heroku..." -ForegroundColor Yellow
    heroku login
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

# Get app name
$defaultName = "floodsense-" + -join ((97..122) | Get-Random -Count 6 | ForEach-Object {[char]$_})
Write-Host ""
Write-Host "Enter your Heroku app name (or press Enter for: $defaultName):" -ForegroundColor Yellow
$appName = Read-Host
if ([string]::IsNullOrWhiteSpace($appName)) {
    $appName = $defaultName
}

Write-Host ""
Write-Host "App name: $appName" -ForegroundColor Cyan
Write-Host ""

# Ask about PostgreSQL
Write-Host "Add PostgreSQL database? (essential-0 plan, `$5/month) [y/n]:" -ForegroundColor Yellow
$addDB = Read-Host
$usePostgres = $addDB -eq "y"

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Starting deployment..." -ForegroundColor Yellow
Write-Host ""

# Create app
Write-Host "[1/6] Creating Heroku app..." -ForegroundColor Cyan
try {
    heroku create $appName 2>&1 | Out-Null
    Write-Host "✓ App created: $appName" -ForegroundColor Green
} catch {
    Write-Host "! App may already exist, continuing..." -ForegroundColor Yellow
}

# Set stack
Write-Host "[2/6] Setting stack to container..." -ForegroundColor Cyan
try {
    heroku stack:set container -a $appName
    Write-Host "✓ Stack set to container" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to set stack" -ForegroundColor Red
    exit 1
}

# Configure environment
Write-Host "[3/6] Configuring environment..." -ForegroundColor Cyan
$secretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

$configs = @{
    "SECRET_KEY" = $secretKey
    "ENVIRONMENT" = "production"
    "CORS_ORIGINS" = "https://$appName.herokuapp.com"
    "MAX_LOGIN_ATTEMPTS" = "5"
    "RATE_LIMIT_REQUESTS" = "100"
}

foreach ($key in $configs.Keys) {
    heroku config:set "$key=$($configs[$key])" -a $appName 2>&1 | Out-Null
}
Write-Host "✓ Environment configured" -ForegroundColor Green

# Add PostgreSQL
if ($usePostgres) {
    Write-Host "[4/6] Adding PostgreSQL database..." -ForegroundColor Cyan
    try {
        heroku addons:create heroku-postgresql:essential-0 -a $appName
        Write-Host "✓ PostgreSQL added" -ForegroundColor Green
        Start-Sleep -Seconds 5
    } catch {
        Write-Host "! Database addon may already exist" -ForegroundColor Yellow
    }
} else {
    Write-Host "[4/6] Skipping PostgreSQL (using SQLite)" -ForegroundColor Cyan
    heroku config:set DATABASE_URL="sqlite:///./database/floodsense.db" -a $appName 2>&1 | Out-Null
    Write-Host "✓ SQLite configured" -ForegroundColor Green
}

# Add remote
Write-Host "[5/6] Adding Heroku remote..." -ForegroundColor Cyan
try {
    heroku git:remote -a $appName 2>&1 | Out-Null
    Write-Host "✓ Remote added" -ForegroundColor Green
} catch {
    Write-Host "! Remote may already exist" -ForegroundColor Yellow
}

# Deploy
Write-Host "[6/6] Deploying to Heroku..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This will take 5-10 minutes. Please wait..." -ForegroundColor Yellow
Write-Host ""

try {
    git push heroku master
    Write-Host ""
    Write-Host "✓ Deployment successful!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    Write-Host "Check logs: heroku logs --tail -a $appName" -ForegroundColor Yellow
    exit 1
}

# Scale
Write-Host ""
Write-Host "Scaling web dyno..." -ForegroundColor Cyan
heroku ps:scale web=1 -a $appName 2>&1 | Out-Null
Write-Host "✓ Dyno scaled" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         DEPLOYMENT SUCCESSFUL! 🎉               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is live at:" -ForegroundColor Yellow
Write-Host "  https://$appName.herokuapp.com" -ForegroundColor Cyan -NoNewline
Write-Host ""
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:    " -ForegroundColor White -NoNewline
Write-Host "heroku logs --tail -a $appName" -ForegroundColor Cyan
Write-Host "  Open app:     " -ForegroundColor White -NoNewline
Write-Host "heroku open -a $appName" -ForegroundColor Cyan
Write-Host "  Restart:      " -ForegroundColor White -NoNewline
Write-Host "heroku restart -a $appName" -ForegroundColor Cyan
Write-Host "  Check status: " -ForegroundColor White -NoNewline
Write-Host "heroku ps -a $appName" -ForegroundColor Cyan
Write-Host ""

# Open app
Write-Host "Open app in browser? [y/n]:" -ForegroundColor Yellow
$openApp = Read-Host
if ($openApp -eq "y") {
    heroku open -a $appName
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Deployment complete! Good luck with your presentation! 🚀" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
