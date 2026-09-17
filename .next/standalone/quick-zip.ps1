# Quick ZIP creator
Compress-Archive -Path "c:\low_voltage_estimator\dist-package\*" -DestinationPath "c:\low_voltage_estimator\LowVoltageEstimator-v3.0.0-dist.zip" -Force
$size = (Get-Item "c:\low_voltage_estimator\LowVoltageEstimator-v3.0.0-dist.zip").Length
$sizeMB = [math]::Round($size / 1MB, 2)
Write-Host "ZIP created: $sizeMB MB"
