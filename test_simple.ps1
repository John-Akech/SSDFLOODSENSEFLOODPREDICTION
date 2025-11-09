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

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/predictions" -Method Post -Body ($testData | ConvertTo-Json) -ContentType "application/json"

Write-Host "Flood Probability: $($response.flood_probability * 100)%"
Write-Host "Confidence Score: $($response.confidence_score * 100)%"
Write-Host "Risk Level: $($response.risk_level)"
Write-Host "Model Predictions:"
$response.model_predictions.PSObject.Properties | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Value * 100)%"
}
Write-Host "Model Count: $($response.model_predictions.PSObject.Properties.Count)"
