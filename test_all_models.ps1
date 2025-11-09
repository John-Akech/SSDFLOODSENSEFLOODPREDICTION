# Test prediction with all 4 models (RF + GB + TCN + LSTM)

$testData = @{
    latitude = 8.5
    longitude = 31.2
    vv_mean = -15.5
    vh_mean = -22.3
    vv_std = 2.1
    vh_std = 1.8
    precipitation = 120.0
    temperature = 28.5
    ndvi = 0.45
    elevation = 420
    slope = 2.5
    water_occurrence = 15.0
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/predictions" -Method Post -Body ($testData | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   PREDICTION WITH ALL 4 MODELS (RF + GB + TCN + LSTM)    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
    
    Write-Host "Flood Probability: " -NoNewline
    Write-Host "$([math]::Round($response.flood_probability * 100, 2))%" -ForegroundColor Yellow
    
    Write-Host "Confidence Score:  " -NoNewline
    $confColor = if($response.confidence_score -gt 0.75){'Green'}elseif($response.confidence_score -gt 0.6){'Yellow'}else{'Red'}
    Write-Host "$([math]::Round($response.confidence_score * 100, 2))%" -ForegroundColor $confColor
    
    Write-Host "Risk Level:        " -NoNewline
    $riskColor = if($response.risk_level -eq 'critical'){'Magenta'}elseif($response.risk_level -eq 'high'){'Red'}else{'Green'}
    Write-Host "$($response.risk_level.ToUpper())" -ForegroundColor $riskColor
    
    Write-Host "`nIndividual Model Predictions:" -ForegroundColor Cyan
    $response.model_predictions.PSObject.Properties | Sort-Object Name | ForEach-Object {
        Write-Host "  $($_.Name.ToUpper()): " -NoNewline -ForegroundColor White
        Write-Host "$([math]::Round($_.Value * 100, 2))%" -ForegroundColor Yellow
    }
    
    $modelCount = $response.model_predictions.PSObject.Properties.Count
    Write-Host "`nModel Count: " -NoNewline
    $countColor = if($modelCount -eq 4){'Green'}else{'Yellow'}
    Write-Host "$modelCount models" -ForegroundColor $countColor
    
    Write-Host "Reliable:    " -NoNewline
    $relColor = if($response.is_reliable){'Green'}else{'Red'}
    Write-Host "$($response.is_reliable)" -ForegroundColor $relColor
    
    if ($modelCount -eq 4) {
        Write-Host "`n✅ SUCCESS: All 4 models are active!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  WARNING: Only $modelCount models active (expected 4)" -ForegroundColor Yellow
    }
} catch {
    $errMsg = $_.Exception.Message
    Write-Host "Error occurred: $errMsg" -ForegroundColor Red
}
