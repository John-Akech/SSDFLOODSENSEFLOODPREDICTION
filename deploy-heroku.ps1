#!/usr/bin/env pwsh
# FloodSense Heroku Deployment Script
# Run with: .\deploy-heroku.ps1 -AppName "your-app-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateApp,
    
    [Parameter(Mandatory=$false)]
    [switch]$AddPostgres,
    
    [Parameter(Mandatory=$false)]
    [switch]$SetupDomain,
    
    [Parameter(Mandatory=$false)]
    [string]$Domain
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  FloodSense Heroku Deployment Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Heroku CLI is installed
function Test-HerokuCLI {
    try {
        $version = heroku --version 2>&1
        Write-Host "✓ Heroku CLI detected: $version" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Heroku CLI not found!" -ForegroundColor Red
        Write-Host "Install from: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
        return $false
    }
}

# Check if logged in to Heroku
function Test-HerokuAuth {
    try {
        $email = heroku auth:whoami 2>&1
        if ($email -match "@") {
            Write-Host "✓ Logged in as: $email" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "✗ Not logged in to Heroku" -ForegroundColor Red
            Write-Host "Run: heroku login" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "✗ Not logged in to Heroku" -ForegroundColor Red
        Write-Host "Run: heroku login" -ForegroundColor Yellow
        return $false
    }
}

# Create Heroku app
function New-HerokuApp {
    param([string]$Name)
    
    Write-Host "`nCreating Heroku app: $Name..." -ForegroundColor Yellow
    
    try {
        heroku create $Name
        Write-Host "✓ App created: $Name" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to create app. It may already exist." -ForegroundColor Red
        Write-Host "Continuing with existing app..." -ForegroundColor Yellow
    }
}

# Set stack to container
function Set-HerokuStack {
    param([string]$Name)
    
    Write-Host "`nSetting stack to container..." -ForegroundColor Yellow
    
    try {
        heroku stack:set container -a $Name
        Write-Host "✓ Stack set to container" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to set stack" -ForegroundColor Red
        throw
    }
}

# Configure environment variables
function Set-HerokuConfig {
    param([string]$Name)
    
    Write-Host "`nConfiguring environment variables..." -ForegroundColor Yellow
    
    # Generate SECRET_KEY
    $secretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    $configs = @{
        "SECRET_KEY" = $secretKey
        "ENVIRONMENT" = "production"
        "CORS_ORIGINS" = "https://$Name.herokuapp.com,https://www.$Name.herokuapp.com"
        "MAX_LOGIN_ATTEMPTS" = "5"
        "RATE_LIMIT_REQUESTS" = "100"
        "ALGORITHM" = "HS256"
        "ACCESS_TOKEN_EXPIRE_MINUTES" = "30"
    }
    
    foreach ($key in $configs.Keys) {
        try {
            heroku config:set "$key=$($configs[$key])" -a $Name
            Write-Host "  ✓ Set $key" -ForegroundColor Green
        }
        catch {
            Write-Host "  ✗ Failed to set $key" -ForegroundColor Red
        }
    }
}

# Add PostgreSQL
function Add-HerokuPostgres {
    param([string]$Name)
    
    Write-Host "`nAdding PostgreSQL database..." -ForegroundColor Yellow
    
    try {
        heroku addons:create heroku-postgresql:essential-0 -a $Name
        Write-Host "✓ PostgreSQL added (essential-0 plan - $5/month)" -ForegroundColor Green
        
        # Wait for database to be ready
        Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Enable PostGIS extension
        Write-Host "Enabling PostGIS extension..." -ForegroundColor Yellow
        $sql = "CREATE EXTENSION IF NOT EXISTS postgis;"
        heroku pg:psql -a $Name --command=$sql
        Write-Host "✓ PostGIS enabled" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to add PostgreSQL" -ForegroundColor Red
        Write-Host "You can add it manually: heroku addons:create heroku-postgresql:essential-0 -a $Name" -ForegroundColor Yellow
    }
}

# Add domain
function Add-HerokuDomain {
    param([string]$Name, [string]$Domain)
    
    Write-Host "`nAdding custom domain..." -ForegroundColor Yellow
    
    try {
        heroku domains:add $Domain -a $Name
        heroku domains:add "www.$Domain" -a $Name
        
        Write-Host "✓ Domain added: $Domain" -ForegroundColor Green
        Write-Host "`nDNS Configuration Required:" -ForegroundColor Yellow
        Write-Host "================================" -ForegroundColor Yellow
        
        $dnsTargets = heroku domains -a $Name
        Write-Host $dnsTargets
        
        Write-Host "`nAdd these CNAME records to your DNS:" -ForegroundColor Cyan
        Write-Host "  Type: CNAME" -ForegroundColor White
        Write-Host "  Name: www" -ForegroundColor White
        Write-Host "  Value: [DNS Target from above]" -ForegroundColor White
        
        # Enable SSL
        Write-Host "`nEnabling SSL..." -ForegroundColor Yellow
        heroku certs:auto:enable -a $Name
        Write-Host "✓ SSL enabled" -ForegroundColor Green
        
        # Update CORS
        heroku config:set CORS_ORIGINS="https://$Domain,https://www.$Domain,https://$Name.herokuapp.com" -a $Name
        Write-Host "✓ CORS updated" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to add domain" -ForegroundColor Red
    }
}

# Deploy to Heroku
function Deploy-ToHeroku {
    param([string]$Name)
    
    Write-Host "`nDeploying to Heroku..." -ForegroundColor Yellow
    Write-Host "This may take 5-10 minutes..." -ForegroundColor Cyan
    
    try {
        # Add remote if not exists
        $remotes = git remote -v
        if (-not ($remotes -match "heroku")) {
            heroku git:remote -a $Name
            Write-Host "✓ Heroku remote added" -ForegroundColor Green
        }
        
        # Deploy
        Write-Host "`nPushing to Heroku..." -ForegroundColor Yellow
        git push heroku master
        
        Write-Host "`n✓ Deployment successful!" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Deployment failed" -ForegroundColor Red
        Write-Host "Check logs: heroku logs --tail -a $Name" -ForegroundColor Yellow
        throw
    }
}

# Scale dynos
function Set-HerokuDynos {
    param([string]$Name)
    
    Write-Host "`nScaling web dyno..." -ForegroundColor Yellow
    
    try {
        heroku ps:scale web=1 -a $Name
        Write-Host "✓ Web dyno scaled to 1" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to scale dynos" -ForegroundColor Red
    }
}

# Main execution
function Main {
    Write-Host "App Name: $AppName" -ForegroundColor Cyan
    Write-Host ""
    
    # Pre-flight checks
    if (-not (Test-HerokuCLI)) {
        exit 1
    }
    
    if (-not (Test-HerokuAuth)) {
        Write-Host "`nPlease login first:" -ForegroundColor Yellow
        heroku login
    }
    
    # Create app if requested
    if ($CreateApp) {
        New-HerokuApp -Name $AppName
    }
    
    # Set stack
    Set-HerokuStack -Name $AppName
    
    # Configure environment
    Set-HerokuConfig -Name $AppName
    
    # Add PostgreSQL if requested
    if ($AddPostgres) {
        Add-HerokuPostgres -Name $AppName
    }
    
    # Setup domain if requested
    if ($SetupDomain -and $Domain) {
        Add-HerokuDomain -Name $AppName -Domain $Domain
    }
    
    # Deploy
    Deploy-ToHeroku -Name $AppName
    
    # Scale dynos
    Set-HerokuDynos -Name $AppName
    
    # Final status
    Write-Host "`n================================================" -ForegroundColor Cyan
    Write-Host "  Deployment Complete!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your app is now live at:" -ForegroundColor Yellow
    Write-Host "  https://$AppName.herokuapp.com" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Yellow
    Write-Host "  View logs:    heroku logs --tail -a $AppName" -ForegroundColor White
    Write-Host "  Open app:     heroku open -a $AppName" -ForegroundColor White
    Write-Host "  Restart:      heroku restart -a $AppName" -ForegroundColor White
    Write-Host "  Scale:        heroku ps:scale web=1 -a $AppName" -ForegroundColor White
    Write-Host "  SSH:          heroku run bash -a $AppName" -ForegroundColor White
    Write-Host ""
    
    # Open app in browser
    $openApp = Read-Host "Open app in browser? (y/n)"
    if ($openApp -eq "y") {
        heroku open -a $AppName
    }
}

# Run main
try {
    Main
}
catch {
    Write-Host "`n✗ Deployment failed: $_" -ForegroundColor Red
    exit 1
}
