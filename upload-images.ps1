# PowerShell script to upload images to server
# Usage: .\upload-images.ps1 -JWT_TOKEN "your_token_here"

param(
    [Parameter(Mandatory=$true)]
    [string]$JWT_TOKEN,
    [string]$API_BASE_URL = "https://api.deutsch-tests.com"
)

$ErrorActionPreference = "Stop"

# Directories
$QuestionsDir = "src\uploads\images\questions"
$StatesDir = "src\uploads\images\ولايات"

$successCount = 0
$failCount = 0

function Upload-Image {
    param(
        [string]$FilePath,
        [string]$FileName,
        [bool]$IsStateImage = $false
    )
    
    try {
        $endpoint = if ($IsStateImage) {
            "$API_BASE_URL/uploads/image?folder=ولايات"
        } else {
            "$API_BASE_URL/uploads/image"
        }
        
        $headers = @{
            "Authorization" = "Bearer $JWT_TOKEN"
        }
        
        $form = @{
            file = Get-Item -Path $FilePath
        }
        
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Form $form
        
        Write-Host "✅ Uploaded: $FileName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Failed to upload $FileName : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "🚀 Starting image upload...`n" -ForegroundColor Cyan

# Upload general questions images
Write-Host "📁 Uploading general questions images..." -ForegroundColor Yellow
if (Test-Path $QuestionsDir) {
    $files = Get-ChildItem -Path $QuestionsDir -Filter "*.jpeg","*.jpg"
    foreach ($file in $files) {
        $result = Upload-Image -FilePath $file.FullName -FileName $file.Name -IsStateImage $false
        if ($result) { $successCount++ } else { $failCount++ }
        Start-Sleep -Milliseconds 300
    }
}

# Upload state images
Write-Host "`n📁 Uploading state questions images..." -ForegroundColor Yellow
if (Test-Path $StatesDir) {
    $files = Get-ChildItem -Path $StatesDir -Filter "*.jpeg","*.jpg"
    foreach ($file in $files) {
        $result = Upload-Image -FilePath $file.FullName -FileName $file.Name -IsStateImage $true
        if ($result) { $successCount++ } else { $failCount++ }
        Start-Sleep -Milliseconds 300
    }
}

Write-Host "`n✅ Upload completed!" -ForegroundColor Green
Write-Host "   Success: $successCount" -ForegroundColor Green
Write-Host "   Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

