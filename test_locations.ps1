# Test Dynamic Predictions - Three Different Locations in South Sudan

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Testing Dynamic Predictions - Location-Based Variation" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Location 1: Bor, Jonglei State
Write-Host "Location 1: Bor, Jonglei State (7.89N, 31.30E)" -ForegroundColor Yellow

$location1 = @{
    latitude = 7.89
    longitude = 31.30
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

$pred1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $location1 -ContentType "application/json"

Write-Host "  Flood Probability: $([math]::Round($pred1.flood_probability * 100, 2))%" -ForegroundColor White
Write-Host "  Confidence Score: $([math]::Round($pred1.confidence_score * 100, 2))%" -ForegroundColor White
Write-Host "  Risk Level: $($pred1.risk_level)" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 2

# Location 2: Bentiu, Unity State
Write-Host "Location 2: Bentiu, Unity State (9.23N, 29.78E)" -ForegroundColor Yellow

$location2 = @{
    latitude = 9.23
    longitude = 29.78
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

$pred2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $location2 -ContentType "application/json"

Write-Host "  Flood Probability: $([math]::Round($pred2.flood_probability * 100, 2))%" -ForegroundColor White
Write-Host "  Confidence Score: $([math]::Round($pred2.confidence_score * 100, 2))%" -ForegroundColor White
Write-Host "  Risk Level: $($pred2.risk_level)" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 2

# Location 3: Malakal, Upper Nile State
Write-Host "Location 3: Malakal, Upper Nile State (9.53N, 31.65E)" -ForegroundColor Yellow

$location3 = @{
    latitude = 9.53
    longitude = 31.65
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

$pred3 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $location3 -ContentType "application/json"

Write-Host "  Flood Probability: $([math]::Round($pred3.flood_probability * 100, 2))%" -ForegroundColor White
Write-Host "  Confidence Score: $([math]::Round($pred3.confidence_score * 100, 2))%" -ForegroundColor White
Write-Host "  Risk Level: $($pred3.risk_level)" -ForegroundColor White
Write-Host ""

# Summary
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  COMPARISON SUMMARY" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Location                 Probability    Confidence    Risk Level" -ForegroundColor White
Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Bor (Jonglei)            $([math]::Round($pred1.flood_probability * 100, 2))%           $([math]::Round($pred1.confidence_score * 100, 2))%          $($pred1.risk_level)" -ForegroundColor White
Write-Host "Bentiu (Unity)           $([math]::Round($pred2.flood_probability * 100, 2))%           $([math]::Round($pred2.confidence_score * 100, 2))%          $($pred2.risk_level)" -ForegroundColor White
Write-Host "Malakal (Upper Nile)     $([math]::Round($pred3.flood_probability * 100, 2))%           $([math]::Round($pred3.confidence_score * 100, 2))%          $($pred3.risk_level)" -ForegroundColor White
Write-Host ""

# Calculate variation
$probabilities = @($pred1.flood_probability, $pred2.flood_probability, $pred3.flood_probability)
$confidences = @($pred1.confidence_score, $pred2.confidence_score, $pred3.confidence_score)

$probDiff = [math]::Round(([math]::Max($probabilities) - [math]::Min($probabilities)) * 100, 2)
$confDiff = [math]::Round(([math]::Max($confidences) - [math]::Min($confidences)) * 100, 2)

Write-Host "Variation Analysis:" -ForegroundColor Yellow
Write-Host "  Probability Range: $probDiff% difference" -ForegroundColor White
Write-Host "  Confidence Range: $confDiff% difference" -ForegroundColor White
Write-Host ""

if ($probDiff -gt 5 -or $confDiff -gt 5) {
    Write-Host "SUCCESS: Predictions show significant variation across locations!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Low variation detected across locations." -ForegroundColor Yellow
}
Write-Host ""
