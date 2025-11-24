# DigitalOcean Deployment Fix Script
# This script automates fixing the SAR routing and backend deployment issues

param(
    [switch]$SkipIngress,
    [switch]$SkipBackend,
    [switch]$TestOnly
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FLOODSENSE DEPLOYMENT FIX AUTOMATION" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Get App ID
Write-Host "[1/5] Getting DigitalOcean App ID..." -ForegroundColor Cyan
$appsJson = doctl apps list --format ID,Spec.Name --output json 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to get app list. Please run 'doctl auth init' first" -ForegroundColor Red
    exit 1
}

$apps = $appsJson | ConvertFrom-Json
$appId = ($apps | Where-Object { $_.spec.name -eq "floodsense" }).id

if (-not $appId) {
    Write-Host "ERROR: Could not find 'floodsense' app. Available apps:" -ForegroundColor Red
    $apps | ForEach-Object { Write-Host "  - $($_.spec.name) (ID: $($_.id))" }
    exit 1
}

Write-Host "   Found app ID: $appId" -ForegroundColor Green

if ($TestOnly) {
    Write-Host "`n[TEST MODE] Would perform these actions:" -ForegroundColor Yellow
    Write-Host "  1. Update App Spec with ingress rules" -ForegroundColor Gray
    Write-Host "  2. Force rebuild backend component" -ForegroundColor Gray
    Write-Host "`nRun without -TestOnly to execute" -ForegroundColor Gray
    exit 0
}

# Fix 1: Update App Spec with correct ingress rule order
if (-not $SkipIngress) {
    Write-Host "`n[2/5] Updating App Spec (fixing SAR routing)..." -ForegroundColor Cyan
    
    $appSpecPath = ".\.do\app-fixed.yaml"
    if (-not (Test-Path $appSpecPath)) {
        Write-Host "ERROR: $appSpecPath not found" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   Applying updated App Spec with ingress rules..." -ForegroundColor Gray
    $updateResult = doctl apps update $appId --spec $appSpecPath 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   SUCCESS: App Spec updated!" -ForegroundColor Green
        Write-Host "   Ingress rules now ordered: /api/v1, /sar, /" -ForegroundColor Green
        Write-Host "   Deployment triggered (2-3 minutes)..." -ForegroundColor Gray
    } else {
        Write-Host "   ERROR: Failed to update App Spec" -ForegroundColor Red
        Write-Host $updateResult -ForegroundColor Red
        Write-Host "`n   Manual fix required:" -ForegroundColor Yellow
        Write-Host "   1. Go to: https://cloud.digitalocean.com/apps/$appId/settings" -ForegroundColor White
        Write-Host "   2. Click 'Edit' on App Spec" -ForegroundColor White
        Write-Host "   3. Copy content from: .\.do\app-fixed.yaml" -ForegroundColor White
        Write-Host "   4. Paste and save" -ForegroundColor White
    }
} else {
    Write-Host "`n[2/5] Skipping ingress fix (--SkipIngress flag)" -ForegroundColor Yellow
}

# Wait for ingress update to complete
if (-not $SkipIngress -and $LASTEXITCODE -eq 0) {
    Write-Host "`n[3/5] Waiting for deployment to complete..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    $maxWait = 180 # 3 minutes
    $waited = 0
    $checkInterval = 10
    
    while ($waited -lt $maxWait) {
        $deploymentInfo = doctl apps get $appId --format "ActiveDeployment.Phase" --no-header 2>&1
        if ($deploymentInfo -match "ACTIVE") {
            Write-Host "   Deployment complete!" -ForegroundColor Green
            break
        }
        Write-Host "   Status: $deploymentInfo (waited $waited seconds)..." -ForegroundColor Gray
        Start-Sleep -Seconds $checkInterval
        $waited += $checkInterval
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "   WARNING: Deployment taking longer than expected" -ForegroundColor Yellow
        Write-Host "   Check status at: https://cloud.digitalocean.com/apps/$appId" -ForegroundColor White
    }
} else {
    Write-Host "`n[3/5] Skipping deployment wait" -ForegroundColor Yellow
}

# Fix 2: Force rebuild backend
if (-not $SkipBackend) {
    Write-Host "`n[4/5] Force rebuilding backend (deploying OpenAPI 3.0.0)..." -ForegroundColor Cyan
    
    # Get backend component ID
    $componentInfo = doctl apps list-components $appId --format Name --no-header 2>&1 | Out-String
    if ($componentInfo -notmatch "backend") {
        Write-Host "   ERROR: Could not find backend component" -ForegroundColor Red
        Write-Host "   Available components: $componentInfo" -ForegroundColor Gray
        exit 1
    }
    
    Write-Host "   Triggering force rebuild of backend..." -ForegroundColor Gray
    $rebuildResult = doctl apps create-deployment $appId --force-rebuild 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   SUCCESS: Backend rebuild triggered!" -ForegroundColor Green
        Write-Host "   This will deploy:" -ForegroundColor Green
        Write-Host "   - OpenAPI 3.0.0 (fixes Swagger UI)" -ForegroundColor Green
        Write-Host "   - SAR static path fixes" -ForegroundColor Green
        Write-Host "   - Docker cache buster" -ForegroundColor Green
        Write-Host "   Waiting 3-4 minutes for completion..." -ForegroundColor Gray
        
        Start-Sleep -Seconds 15
        $maxWait = 240 # 4 minutes
        $waited = 0
        $checkInterval = 15
        
        while ($waited -lt $maxWait) {
            $deploymentInfo = doctl apps get $appId --format "ActiveDeployment.Phase" --no-header 2>&1
            if ($deploymentInfo -match "ACTIVE") {
                Write-Host "   Backend deployment complete!" -ForegroundColor Green
                break
            }
            Write-Host "   Building... (waited $waited seconds)" -ForegroundColor Gray
            Start-Sleep -Seconds $checkInterval
            $waited += $checkInterval
        }
    } else {
        Write-Host "   ERROR: Failed to trigger rebuild" -ForegroundColor Red
        Write-Host $rebuildResult -ForegroundColor Red
        Write-Host "`n   Manual fix required:" -ForegroundColor Yellow
        Write-Host "   1. Go to: https://cloud.digitalocean.com/apps/$appId" -ForegroundColor White
        Write-Host "   2. Click on 'backend' component" -ForegroundColor White
        Write-Host "   3. Click (...) menu > 'Force Rebuild and Deploy'" -ForegroundColor White
    }
} else {
    Write-Host "`n[4/5] Skipping backend rebuild (--SkipBackend flag)" -ForegroundColor Yellow
}

# Verification
Write-Host "`n[5/5] Running verification tests..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

$baseUrl = "https://floodsense-app-6a3uy.ondigitalocean.app"
$allPassed = $true

# Test 1: OpenAPI version
Write-Host "`n   Test 1: OpenAPI Version..." -ForegroundColor Gray
try {
    $openapi = Invoke-RestMethod "$baseUrl/api/v1/openapi.json" -ErrorAction Stop
    if ($openapi.openapi -eq "3.0.0") {
        Write-Host "   PASS: OpenAPI is 3.0.0" -ForegroundColor Green
    } else {
        Write-Host "   FAIL: OpenAPI is $($openapi.openapi) (expected 3.0.0)" -ForegroundColor Red
        Write-Host "         Backend may need more time to deploy" -ForegroundColor Yellow
        $allPassed = $false
    }
} catch {
    Write-Host "   FAIL: Could not fetch OpenAPI spec" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Swagger UI
Write-Host "   Test 2: Swagger UI..." -ForegroundColor Gray
try {
    $swagger = Invoke-WebRequest "$baseUrl/api/v1/docs" -UseBasicParsing -ErrorAction Stop
    if ($swagger.StatusCode -eq 200 -and $swagger.Content -notmatch "Unable to render") {
        Write-Host "   PASS: Swagger UI accessible" -ForegroundColor Green
    } else {
        Write-Host "   FAIL: Swagger UI may have errors" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "   FAIL: Could not access Swagger UI" -ForegroundColor Red
    $allPassed = $false
}

# Test 3: SAR Route
Write-Host "   Test 3: SAR Route..." -ForegroundColor Gray
try {
    $sar = Invoke-WebRequest "$baseUrl/sar" -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    if ($sar.Content -match "Flood Detection" -or $sar.Content -match "SAR") {
        Write-Host "   PASS: SAR route serving correct content" -ForegroundColor Green
    } else {
        Write-Host "   FAIL: SAR may be redirecting to frontend" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 302) {
        Write-Host "   FAIL: SAR redirecting (ingress may need more time)" -ForegroundColor Red
        $allPassed = $false
    }
}

# Test 4: Backend API
Write-Host "   Test 4: Backend API..." -ForegroundColor Gray
try {
    $alerts = Invoke-RestMethod "$baseUrl/api/v1/alerts" -ErrorAction Stop
    Write-Host "   PASS: Backend API responding" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: Backend API error" -ForegroundColor Red
    $allPassed = $false
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL FIXES APPLIED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Your application is ready for defense!" -ForegroundColor Green
    Write-Host "`nQuick Links:" -ForegroundColor Cyan
    Write-Host "  Frontend: $baseUrl" -ForegroundColor White
    Write-Host "  Swagger:  $baseUrl/api/v1/docs" -ForegroundColor White
    Write-Host "  SAR:      $baseUrl/sar" -ForegroundColor White
} else {
    Write-Host "  SOME TESTS FAILED" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  - Deployments still in progress (wait 2-3 more minutes)" -ForegroundColor Gray
    Write-Host "  - Browser cache (use Ctrl+Shift+R or incognito)" -ForegroundColor Gray
    Write-Host "  - Manual intervention needed (see errors above)" -ForegroundColor Gray
    Write-Host "`nRun full test suite: .\test_deployment.ps1" -ForegroundColor White
}
Write-Host ""
