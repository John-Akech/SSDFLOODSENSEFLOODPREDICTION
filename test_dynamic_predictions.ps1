# Test Dynamic Predictions - Three Different Locations in South Sudan
# This script tests if predictions and confidence scores vary by location

Write-Host "`n╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Testing Dynamic Predictions - Location-Based Variation         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Location 1: Bor, Jonglei State (flood-prone, riverine area)
Write-Host "`n📍 LOCATION 1: Bor, Jonglei State" -ForegroundColor Yellow
Write-Host "   Coordinates: 7.89°N, 31.30°E" -ForegroundColor Gray
Write-Host "   Region: Flood-prone riverine area near White Nile`n" -ForegroundColor Gray

$location1 = @{
    latitude = 7.89
    longitude = 31.30
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

try {
    $pred1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $location1 -ContentType "application/json"
    
    Write-Host "✓ Prediction Result:" -ForegroundColor Green
    Write-Host "  • Flood Probability: $($pred1.flood_probability * 100)%" -ForegroundColor White
    Write-Host "  • Confidence Score: $($pred1.confidence_score * 100)%" -ForegroundColor White
    Write-Host "  • Risk Level: $($pred1.risk_level)" -ForegroundColor White
    Write-Host "  • Model Type: $($pred1.model_type)" -ForegroundColor White
    Write-Host "  • Inference Time: $($pred1.inference_time_ms)ms" -ForegroundColor Gray
    
    if ($pred1.model_predictions) {
        Write-Host "`n  Individual Model Predictions:" -ForegroundColor Cyan
        $pred1.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "    - $($_.Name): $($_.Value * 100)%" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Location 2: Bentiu, Unity State (oil region, different terrain)
Write-Host "`n`n📍 LOCATION 2: Bentiu, Unity State" -ForegroundColor Yellow
Write-Host "   Coordinates: 9.23°N, 29.78°E" -ForegroundColor Gray
Write-Host "   Region: Oil-rich area with different flood patterns`n" -ForegroundColor Gray

$location2 = @{
    latitude = 9.23
    longitude = 29.78
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

try {
    $pred2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $location2 -ContentType "application/json"
    
    Write-Host "✓ Prediction Result:" -ForegroundColor Green
    Write-Host "  • Flood Probability: $($pred2.flood_probability * 100)%" -ForegroundColor White
    Write-Host "  • Confidence Score: $($pred2.confidence_score * 100)%" -ForegroundColor White
    Write-Host "  • Risk Level: $($pred2.risk_level)" -ForegroundColor White
    Write-Host "  • Model Type: $($pred2.model_type)" -ForegroundColor White
    Write-Host "  • Inference Time: $($pred2.inference_time_ms)ms" -ForegroundColor Gray
    
    if ($pred2.model_predictions) {
        Write-Host "`n  Individual Model Predictions:" -ForegroundColor Cyan
        $pred2.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "    - $($_.Name): $($_.Value * 100)%" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Location 3: Malakal, Upper Nile State (confluence area)
Write-Host "`n`n📍 LOCATION 3: Malakal, Upper Nile State" -ForegroundColor Yellow
Write-Host "   Coordinates: 9.53°N, 31.65°E" -ForegroundColor Gray
Write-Host "   Region: Major river confluence, high flood risk`n" -ForegroundColor Gray

$location3 = @{
    latitude = 9.53
    longitude = 31.65
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

try {
    $pred3 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $location3 -ContentType "application/json"
    
    Write-Host "✓ Prediction Result:" -ForegroundColor Green
    Write-Host "  • Flood Probability: $($pred3.flood_probability * 100)%" -ForegroundColor White
    Write-Host "  • Confidence Score: $($pred3.confidence_score * 100)%" -ForegroundColor White
    Write-Host "  • Risk Level: $($pred3.risk_level)" -ForegroundColor White
    Write-Host "  • Model Type: $($pred3.model_type)" -ForegroundColor White
    Write-Host "  • Inference Time: $($pred3.inference_time_ms)ms" -ForegroundColor Gray
    
    if ($pred3.model_predictions) {
        Write-Host "`n  Individual Model Predictions:" -ForegroundColor Cyan
        $pred3.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "    - $($_.Name): $($_.Value * 100)%" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary and Comparison
Write-Host "`n`n╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  COMPARISON SUMMARY                                              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if ($pred1 -and $pred2 -and $pred3) {
    Write-Host "Location Variations:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Location          | Probability | Confidence | Risk Level" -ForegroundColor White
    Write-Host "  ------------------|-------------|------------|------------" -ForegroundColor Gray
    Write-Host "  Bor (Jonglei)     | $([math]::Round($pred1.flood_probability * 100, 2))%      | $([math]::Round($pred1.confidence_score * 100, 2))%       | $($pred1.risk_level)" -ForegroundColor White
    Write-Host "  Bentiu (Unity)    | $([math]::Round($pred2.flood_probability * 100, 2))%      | $([math]::Round($pred2.confidence_score * 100, 2))%       | $($pred2.risk_level)" -ForegroundColor White
    Write-Host "  Malakal (U.Nile)  | $([math]::Round($pred3.flood_probability * 100, 2))%      | $([math]::Round($pred3.confidence_score * 100, 2))%       | $($pred3.risk_level)" -ForegroundColor White
    
    # Calculate variance
    $probabilities = @($pred1.flood_probability, $pred2.flood_probability, $pred3.flood_probability)
    $confidences = @($pred1.confidence_score, $pred2.confidence_score, $pred3.confidence_score)
    
    $probDiff = [math]::Round(([math]::Max($probabilities) - [math]::Min($probabilities)) * 100, 2)
    $confDiff = [math]::Round(([math]::Max($confidences) - [math]::Min($confidences)) * 100, 2)
    
    Write-Host "`n  Variation Analysis:" -ForegroundColor Yellow
    Write-Host "  • Probability Range: $probDiff% difference" -ForegroundColor $(if($probDiff -gt 5){"Green"}else{"Yellow"})
    Write-Host "  • Confidence Range: $confDiff% difference" -ForegroundColor $(if($confDiff -gt 5){"Green"}else{"Yellow"})
    
    if ($probDiff -gt 5 -or $confDiff -gt 5) {
        Write-Host "`n  ✓ SUCCESS: Predictions show significant variation across locations!" -ForegroundColor Green
        Write-Host "    The model is responding to different geographical features and data." -ForegroundColor Green
    } else {
        Write-Host "`n  ⚠ WARNING: Low variation detected across locations." -ForegroundColor Yellow
        Write-Host "    This might indicate the model needs more location-specific training data." -ForegroundColor Yellow
    }
}

Write-Host ""
