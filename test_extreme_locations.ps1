# Test More Extreme Location Differences

Write-Host ""
Write-Host "Testing predictions across very different terrain types..." -ForegroundColor Cyan
Write-Host ""

# High elevation area (less flood-prone)
$highland = @{
    latitude = 4.5
    longitude = 30.5
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

Write-Host "Location 1: Highland Area (4.5N, 30.5E)" -ForegroundColor Yellow
$pred1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $highland -ContentType "application/json"
Write-Host "  Probability: $([math]::Round($pred1.flood_probability * 100, 2))% | Confidence: $([math]::Round($pred1.confidence_score * 100, 2))% | Risk: $($pred1.risk_level)" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 2

# Sudd wetland (naturally flooded)
$wetland = @{
    latitude = 7.5
    longitude = 30.5
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

Write-Host "Location 2: Sudd Wetland (7.5N, 30.5E)" -ForegroundColor Yellow
$pred2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $wetland -ContentType "application/json"
Write-Host "  Probability: $([math]::Round($pred2.flood_probability * 100, 2))% | Confidence: $([math]::Round($pred2.confidence_score * 100, 2))% | Risk: $($pred2.risk_level)" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 2

# Northern area (different climate)
$northern = @{
    latitude = 10.5
    longitude = 27.5
    model_type = "ensemble"
    lead_time_hours = 48
} | ConvertTo-Json

Write-Host "Location 3: Northern Area (10.5N, 27.5E)" -ForegroundColor Yellow
$pred3 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $northern -ContentType "application/json"
Write-Host "  Probability: $([math]::Round($pred3.flood_probability * 100, 2))% | Confidence: $([math]::Round($pred3.confidence_score * 100, 2))% | Risk: $($pred3.risk_level)" -ForegroundColor White
Write-Host ""

# Calculate variation
$probs = @($pred1.flood_probability, $pred2.flood_probability, $pred3.flood_probability)
$confs = @($pred1.confidence_score, $pred2.confidence_score, $pred3.confidence_score)

$maxProb = ($probs | Measure-Object -Maximum).Maximum
$minProb = ($probs | Measure-Object -Minimum).Minimum
$probRange = [math]::Round(($maxProb - $minProb) * 100, 2)

$maxConf = ($confs | Measure-Object -Maximum).Maximum
$minConf = ($confs | Measure-Object -Minimum).Minimum
$confRange = [math]::Round(($maxConf - $minConf) * 100, 2)

Write-Host "Variation across terrain types:" -ForegroundColor Cyan
Write-Host "  Probability range: $probRange%" -ForegroundColor White
Write-Host "  Confidence range: $confRange%" -ForegroundColor White
Write-Host ""
