$ErrorActionPreference = "Stop"

$apiDir = "C:\Users\pavlo\client-info"
Set-Location $apiDir

Write-Host "Starting client-info-api on http://127.0.0.1:3000"
npm start
