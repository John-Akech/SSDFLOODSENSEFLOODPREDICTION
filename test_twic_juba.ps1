# Test Twic East and Juba Predictions

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Testing Predictions: Twic East vs Juba" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Location 1: Twic East, Jonglei State (flood-prone, rural)
Write-Host "Location 1: Twic East, Jonglei State" -ForegroundColor Yellow
Write-Host "  Coordinates: 7.012N, 31.306E" -ForegroundColor Gray
Write-Host "  Characteristics: Rural, flood-prone, riverine area" -ForegroundColor Gray
Write-Host ""

$twicEast = @{
    latitude = 7.012
    longitude = 31.306
    model_type = "ensemble"
    lead_time_hours = 48
    district = "Twic East"
} | ConvertTo-Json

try {
    $pred1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $twicEast -ContentType "application/json"
    
    Write-Host "  Result:" -ForegroundColor Green
    Write-Host "    Flood Probability: $([math]::Round($pred1.flood_probability * 100, 2))%" -ForegroundColor White
    Write-Host "    Confidence Score: $([math]::Round($pred1.confidence_score * 100, 2))%" -ForegroundColor White
    Write-Host "    Risk Level: $($pred1.risk_level.ToUpper())" -ForegroundColor $(if($pred1.risk_level -eq 'critical'){'Red'}elseif($pred1.risk_level -eq 'high'){'Yellow'}else{'Green'})
    Write-Host "    Inference Time: $([math]::Round($pred1.inference_time_ms, 2))ms" -ForegroundColor Gray
    
    if ($pred1.model_predictions) {
        Write-Host ""
        Write-Host "    Individual Model Predictions:" -ForegroundColor Cyan
        $pred1.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "      $($_.Name): $([math]::Round($_.Value * 100, 2))%" -ForegroundColor Gray
        }
    }
    
    if ($pred1.warning_message) {
        Write-Host ""
        Write-Host "    Warning: $($pred1.warning_message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""
Start-Sleep -Seconds 3

# Location 2: Juba, Central Equatoria (capital city, urban)
Write-Host "Location 2: Juba, Central Equatoria" -ForegroundColor Yellow
Write-Host "  Coordinates: 4.859N, 31.571E" -ForegroundColor Gray
Write-Host "  Characteristics: Capital city, urban, different terrain" -ForegroundColor Gray
Write-Host ""

$juba = @{
    latitude = 4.859
    longitude = 31.571
    model_type = "ensemble"
    lead_time_hours = 48
    district = "Juba"
} | ConvertTo-Json

try {
    $pred2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $juba -ContentType "application/json"
    
    Write-Host "  Result:" -ForegroundColor Green
    Write-Host "    Flood Probability: $([math]::Round($pred2.flood_probability * 100, 2))%" -ForegroundColor White
    Write-Host "    Confidence Score: $([math]::Round($pred2.confidence_score * 100, 2))%" -ForegroundColor White
    Write-Host "    Risk Level: $($pred2.risk_level.ToUpper())" -ForegroundColor $(if($pred2.risk_level -eq 'critical'){'Red'}elseif($pred2.risk_level -eq 'high'){'Yellow'}else{'Green'})
    Write-Host "    Inference Time: $([math]::Round($pred2.inference_time_ms, 2))ms" -ForegroundColor Gray
    
    if ($pred2.model_predictions) {
        Write-Host ""
        Write-Host "    Individual Model Predictions:" -ForegroundColor Cyan
        $pred2.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "      $($_.Name): $([math]::Round($_.Value * 100, 2))%" -ForegroundColor Gray
        }
    }
    
    if ($pred2.warning_message) {
        Write-Host ""
        Write-Host "    Warning: $($pred2.warning_message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Comparison
if ($pred1 -and $pred2) {
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "  DETAILED COMPARISON" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Metric                    Twic East         Juba            Difference" -ForegroundColor White
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Gray
    
    $probDiff = [math]::Round(($pred1.flood_probability - $pred2.flood_probability) * 100, 2)
    $confDiff = [math]::Round(($pred1.confidence_score - $pred2.confidence_score) * 100, 2)
    $timeDiff = [math]::Round($pred1.inference_time_ms - $pred2.inference_time_ms, 2)
    
    Write-Host "Flood Probability         $([math]::Round($pred1.flood_probability * 100, 2))%            $([math]::Round($pred2.flood_probability * 100, 2))%           $probDiff%" -ForegroundColor White
    Write-Host "Confidence Score          $([math]::Round($pred1.confidence_score * 100, 2))%            $([math]::Round($pred2.confidence_score * 100, 2))%           $confDiff%" -ForegroundColor White
    Write-Host "Risk Level                $($pred1.risk_level.ToUpper().PadRight(17))$($pred2.risk_level.ToUpper())" -ForegroundColor White
    Write-Host "Inference Time            $([math]::Round($pred1.inference_time_ms, 2))ms           $([math]::Round($pred2.inference_time_ms, 2))ms          $timeDiff ms" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Analysis:" -ForegroundColor Yellow
    
    $absProbDiff = [math]::Abs($probDiff)
    $absConfDiff = [math]::Abs($confDiff)
    
    if ($absProbDiff -gt 10) {
        Write-Host "  [+] SIGNIFICANT probability variation ($absProbDiff%) - Models are location-sensitive!" -ForegroundColor Green
    } elseif ($absProbDiff -gt 5) {
        Write-Host "  [~] MODERATE probability variation ($absProbDiff%) - Some location sensitivity" -ForegroundColor Yellow
    } else {
        Write-Host "  [-] LOW probability variation ($absProbDiff%) - Limited location sensitivity" -ForegroundColor Red
    }
    
    if ($absConfDiff -gt 10) {
        Write-Host "  [+] SIGNIFICANT confidence variation ($absConfDiff%) - Data quality varies by location" -ForegroundColor Green
    } elseif ($absConfDiff -gt 5) {
        Write-Host "  [~] MODERATE confidence variation ($absConfDiff%) - Some data quality difference" -ForegroundColor Yellow
    } else {
        Write-Host "  [-] LOW confidence variation ($absConfDiff%) - Similar data quality" -ForegroundColor Red
    }
    
    if ($pred1.risk_level -ne $pred2.risk_level) {
        Write-Host "  [+] DIFFERENT risk levels - Clear distinction between locations" -ForegroundColor Green
    } else {
        Write-Host "  [~] SAME risk level - May need more diverse test locations" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Overall assessment
    if (($absProbDiff -gt 5 -or $absConfDiff -gt 5) -or ($pred1.risk_level -ne $pred2.risk_level)) {
        Write-Host "  VERDICT: Dynamic predictions are working correctly!" -ForegroundColor Green
        Write-Host "           Predictions vary based on location characteristics." -ForegroundColor Green
    } else {
        Write-Host "  VERDICT: Limited variation detected." -ForegroundColor Yellow
        Write-Host "           May need more location-specific training data." -ForegroundColor Yellow
    }
}

Write-Host ""
