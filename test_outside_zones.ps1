# Test Predictions Outside Primary Flood Zones
# Testing: Central Equatoria, Western Equatoria, and Lakes State

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Testing Areas Outside Jonglei/Unity/Upper Nile" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Location 1: Yambio, Western Equatoria (southwestern, forested)
Write-Host "Location 1: Yambio, Western Equatoria" -ForegroundColor Yellow
Write-Host "  Coordinates: 4.57N, 28.41E" -ForegroundColor Gray
Write-Host "  Characteristics: Southwestern region, forested, higher elevation" -ForegroundColor Gray
Write-Host ""

$yambio = @{
    latitude = 4.57
    longitude = 28.41
    model_type = "ensemble"
    lead_time_hours = 48
    district = "Yambio"
} | ConvertTo-Json

try {
    $pred1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $yambio -ContentType "application/json"
    
    Write-Host "  Result:" -ForegroundColor Green
    Write-Host "    Flood Probability: $([math]::Round($pred1.flood_probability * 100, 2))%" -ForegroundColor White
    Write-Host "    Confidence Score: $([math]::Round($pred1.confidence_score * 100, 2))%" -ForegroundColor White
    Write-Host "    Risk Level: $($pred1.risk_level.ToUpper())" -ForegroundColor $(if($pred1.risk_level -eq 'critical'){'Red'}elseif($pred1.risk_level -eq 'high'){'Yellow'}else{'Green'})
    
    if ($pred1.model_predictions) {
        Write-Host "    Model Predictions:" -ForegroundColor Cyan
        $pred1.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "      $($_.Name): $([math]::Round($_.Value * 100, 2))%" -ForegroundColor Gray
        }
    }
    
    if ($pred1.warning_message) {
        Write-Host "    Warning: $($pred1.warning_message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 3

# Location 2: Rumbek, Lakes State (central, semi-arid)
Write-Host "Location 2: Rumbek, Lakes State" -ForegroundColor Yellow
Write-Host "  Coordinates: 6.81N, 29.68E" -ForegroundColor Gray
Write-Host "  Characteristics: Central region, semi-arid, seasonal flooding" -ForegroundColor Gray
Write-Host ""

$rumbek = @{
    latitude = 6.81
    longitude = 29.68
    model_type = "ensemble"
    lead_time_hours = 48
    district = "Rumbek"
} | ConvertTo-Json

try {
    $pred2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $rumbek -ContentType "application/json"
    
    Write-Host "  Result:" -ForegroundColor Green
    Write-Host "    Flood Probability: $([math]::Round($pred2.flood_probability * 100, 2))%" -ForegroundColor White
    Write-Host "    Confidence Score: $([math]::Round($pred2.confidence_score * 100, 2))%" -ForegroundColor White
    Write-Host "    Risk Level: $($pred2.risk_level.ToUpper())" -ForegroundColor $(if($pred2.risk_level -eq 'critical'){'Red'}elseif($pred2.risk_level -eq 'high'){'Yellow'}else{'Green'})
    
    if ($pred2.model_predictions) {
        Write-Host "    Model Predictions:" -ForegroundColor Cyan
        $pred2.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "      $($_.Name): $([math]::Round($_.Value * 100, 2))%" -ForegroundColor Gray
        }
    }
    
    if ($pred2.warning_message) {
        Write-Host "    Warning: $($pred2.warning_message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 3

# Location 3: Torit, Eastern Equatoria (eastern highlands)
Write-Host "Location 3: Torit, Eastern Equatoria" -ForegroundColor Yellow
Write-Host "  Coordinates: 4.41N, 32.57E" -ForegroundColor Gray
Write-Host "  Characteristics: Eastern highlands, better drainage, lower flood risk" -ForegroundColor Gray
Write-Host ""

$torit = @{
    latitude = 4.41
    longitude = 32.57
    model_type = "ensemble"
    lead_time_hours = 48
    district = "Torit"
} | ConvertTo-Json

try {
    $pred3 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $torit -ContentType "application/json"
    
    Write-Host "  Result:" -ForegroundColor Green
    Write-Host "    Flood Probability: $([math]::Round($pred3.flood_probability * 100, 2))%" -ForegroundColor White
    Write-Host "    Confidence Score: $([math]::Round($pred3.confidence_score * 100, 2))%" -ForegroundColor White
    Write-Host "    Risk Level: $($pred3.risk_level.ToUpper())" -ForegroundColor $(if($pred3.risk_level -eq 'critical'){'Red'}elseif($pred3.risk_level -eq 'high'){'Yellow'}else{'Green'})
    
    if ($pred3.model_predictions) {
        Write-Host "    Model Predictions:" -ForegroundColor Cyan
        $pred3.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "      $($_.Name): $([math]::Round($_.Value * 100, 2))%" -ForegroundColor Gray
        }
    }
    
    if ($pred3.warning_message) {
        Write-Host "    Warning: $($pred3.warning_message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 2

# Comparison with primary flood zone (for reference)
Write-Host "Location 4: Twic East, Jonglei (PRIMARY FLOOD ZONE - Reference)" -ForegroundColor Magenta
Write-Host "  Coordinates: 7.012N, 31.306E" -ForegroundColor Gray
Write-Host ""

$twicEast = @{
    latitude = 7.012
    longitude = 31.306
    model_type = "ensemble"
    lead_time_hours = 48
    district = "Twic East"
} | ConvertTo-Json

try {
    $pred4 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body $twicEast -ContentType "application/json"
    
    Write-Host "  Result:" -ForegroundColor Green
    Write-Host "    Flood Probability: $([math]::Round($pred4.flood_probability * 100, 2))%" -ForegroundColor White
    Write-Host "    Confidence Score: $([math]::Round($pred4.confidence_score * 100, 2))%" -ForegroundColor White
    Write-Host "    Risk Level: $($pred4.risk_level.ToUpper())" -ForegroundColor Red
    
    if ($pred4.model_predictions) {
        Write-Host "    Model Predictions:" -ForegroundColor Cyan
        $pred4.model_predictions.PSObject.Properties | ForEach-Object {
            Write-Host "      $($_.Name): $([math]::Round($_.Value * 100, 2))%" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Detailed Comparison
if ($pred1 -and $pred2 -and $pred3 -and $pred4) {
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "  COMPREHENSIVE COMPARISON" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Location                      Probability    Confidence    Risk Level" -ForegroundColor White
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Yambio (W. Equatoria)         $([math]::Round($pred1.flood_probability * 100, 2))%          $([math]::Round($pred1.confidence_score * 100, 2))%          $($pred1.risk_level.ToUpper())" -ForegroundColor White
    Write-Host "Rumbek (Lakes)                $([math]::Round($pred2.flood_probability * 100, 2))%          $([math]::Round($pred2.confidence_score * 100, 2))%          $($pred2.risk_level.ToUpper())" -ForegroundColor White
    Write-Host "Torit (E. Equatoria)          $([math]::Round($pred3.flood_probability * 100, 2))%          $([math]::Round($pred3.confidence_score * 100, 2))%          $($pred3.risk_level.ToUpper())" -ForegroundColor White
    Write-Host "Twic East (Jonglei)*          $([math]::Round($pred4.flood_probability * 100, 2))%          $([math]::Round($pred4.confidence_score * 100, 2))%          $($pred4.risk_level.ToUpper())" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "* Primary flood zone (training data region)" -ForegroundColor Gray
    Write-Host ""
    
    # Calculate statistics
    $allProbs = @($pred1.flood_probability, $pred2.flood_probability, $pred3.flood_probability, $pred4.flood_probability)
    $allConfs = @($pred1.confidence_score, $pred2.confidence_score, $pred3.confidence_score, $pred4.confidence_score)
    
    $maxProb = ($allProbs | Measure-Object -Maximum).Maximum
    $minProb = ($allProbs | Measure-Object -Minimum).Minimum
    $avgProb = ($allProbs | Measure-Object -Average).Average
    $probRange = [math]::Round(($maxProb - $minProb) * 100, 2)
    
    $maxConf = ($allConfs | Measure-Object -Maximum).Maximum
    $minConf = ($allConfs | Measure-Object -Minimum).Minimum
    $avgConf = ($allConfs | Measure-Object -Average).Average
    $confRange = [math]::Round(($maxConf - $minConf) * 100, 2)
    
    Write-Host "Statistical Analysis:" -ForegroundColor Yellow
    Write-Host "  Probability - Range: $probRange% | Average: $([math]::Round($avgProb * 100, 2))%" -ForegroundColor White
    Write-Host "  Confidence  - Range: $confRange% | Average: $([math]::Round($avgConf * 100, 2))%" -ForegroundColor White
    Write-Host ""
    
    # Risk level distribution
    $riskLevels = @($pred1.risk_level, $pred2.risk_level, $pred3.risk_level, $pred4.risk_level)
    $uniqueRisks = $riskLevels | Select-Object -Unique
    Write-Host "  Risk Level Diversity: $($uniqueRisks.Count) different levels across 4 locations" -ForegroundColor White
    Write-Host ""
    
    # Analysis
    Write-Host "Key Findings:" -ForegroundColor Yellow
    Write-Host ""
    
    # Compare non-flood zones to flood zone
    $nonFloodAvg = [math]::Round((($pred1.flood_probability + $pred2.flood_probability + $pred3.flood_probability) / 3) * 100, 2)
    $floodZone = [math]::Round($pred4.flood_probability * 100, 2)
    $diff = [math]::Round($floodZone - $nonFloodAvg, 2)
    
    if ([math]::Abs($diff) -gt 5) {
        Write-Host "  [+] Flood zone vs other areas: ${diff}% difference" -ForegroundColor Green
        Write-Host "      Models distinguish primary flood zones from other regions" -ForegroundColor Green
    } else {
        Write-Host "  [~] Flood zone vs other areas: ${diff}% difference" -ForegroundColor Yellow
        Write-Host "      Similar risk across regions (possible widespread flooding season)" -ForegroundColor Yellow
    }
    Write-Host ""
    
    if ($confRange -gt 10) {
        Write-Host "  [+] High confidence variation ($confRange%)" -ForegroundColor Green
        Write-Host "      Models adjust certainty based on training data coverage" -ForegroundColor Green
    } else {
        Write-Host "  [~] Moderate confidence variation ($confRange%)" -ForegroundColor Yellow
        Write-Host "      Models fairly confident across all regions" -ForegroundColor Yellow
    }
    Write-Host ""
    
    if ($uniqueRisks.Count -gt 1) {
        Write-Host "  [+] Multiple risk levels detected" -ForegroundColor Green
        Write-Host "      Models differentiate between high and critical risk areas" -ForegroundColor Green
    } else {
        Write-Host "  [-] Same risk level across all locations" -ForegroundColor Yellow
        Write-Host "      May indicate widespread flood conditions or model limitation" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Overall verdict
    Write-Host "Overall Assessment:" -ForegroundColor Cyan
    if ($probRange -gt 10 -or $confRange -gt 15) {
        Write-Host "  Models show GOOD geographic sensitivity and generalization!" -ForegroundColor Green
        Write-Host "  Predictions vary appropriately across different regions." -ForegroundColor Green
    } elseif ($probRange -gt 5 -or $confRange -gt 10) {
        Write-Host "  Models show MODERATE geographic sensitivity." -ForegroundColor Yellow
        Write-Host "  Some variation present, could be improved with more diverse training data." -ForegroundColor Yellow
    } else {
        Write-Host "  Models show LIMITED geographic sensitivity." -ForegroundColor Red
        Write-Host "  Consider adding more training data from diverse regions." -ForegroundColor Red
    }
}

Write-Host ""
