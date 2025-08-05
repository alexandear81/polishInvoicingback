# PowerShell script to test deployed KSeF Mock Service
# Run with: .\test-deployed.ps1

param(
    [string]$BackendUrl = "https://polishinvoicingback-1.onrender.com"
)

Write-Host "🚀 Testing Deployed KSeF Mock Service" -ForegroundColor Green
Write-Host ("="*50) -ForegroundColor Blue
Write-Host "🌐 Backend URL: $BackendUrl" -ForegroundColor Cyan

try {
    # 1. Test backend health
    Write-Host "`n1️⃣ Testing Backend Health..." -ForegroundColor Yellow
    $healthResponse = Invoke-RestMethod -Uri "$BackendUrl/health" -Method Get -ErrorAction Stop
    
    Write-Host "✅ Backend Status: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "⏰ Uptime: $([math]::Round($healthResponse.uptime))s" -ForegroundColor White
    Write-Host "🌍 Environment: $($healthResponse.env)" -ForegroundColor White
    
    # 2. Check KSeF configuration
    Write-Host "`n2️⃣ Checking KSeF Configuration..." -ForegroundColor Yellow
    $configResponse = Invoke-RestMethod -Uri "$BackendUrl/api/ksef/config" -Method Get -ErrorAction Stop
    
    Write-Host "🎭 Mode: $($configResponse.mode)" -ForegroundColor White
    Write-Host "📡 Base URL: $($configResponse.baseUrl)" -ForegroundColor White
    Write-Host "💬 Message: $($configResponse.message)" -ForegroundColor White
    
    if ($configResponse.features) {
        Write-Host "✨ Features: $($configResponse.features -join ', ')" -ForegroundColor White
    }
    
    if ($configResponse.mode -ne "mock") {
        Write-Host "⚠️  Warning: Mock mode not enabled on deployment" -ForegroundColor Red
        Write-Host "💡 You may need to set USE_MOCK_KSEF=true in environment variables" -ForegroundColor Yellow
    }
    
    # 3. Test mock service health (if mock mode is enabled)
    if ($configResponse.mode -eq "mock") {
        Write-Host "`n3️⃣ Testing Mock Service Health..." -ForegroundColor Yellow
        try {
            $mockHealthResponse = Invoke-RestMethod -Uri "$BackendUrl/api/ksef-mock/health" -Method Get -ErrorAction Stop
            
            Write-Host "✅ Mock Service: $($mockHealthResponse.status)" -ForegroundColor Green
            Write-Host "📊 Active Sessions: $($mockHealthResponse.activeSessions)" -ForegroundColor White
            Write-Host "📦 Stored Invoices: $($mockHealthResponse.storedInvoices)" -ForegroundColor White
        }
        catch {
            Write-Host "❌ Mock service not responding: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # 4. Test authorization challenge
        Write-Host "`n4️⃣ Testing Authorization Challenge..." -ForegroundColor Yellow
        
        $challengeBody = @{
            contextIdentifier = @{
                type = "onip"
                identifier = "1111111111"
            }
        } | ConvertTo-Json
        
        $challengeResponse = Invoke-RestMethod -Uri "$BackendUrl/api/ksef-mock/online/Session/AuthorisationChallenge" `
            -Method Post `
            -ContentType "application/json" `
            -Body $challengeBody `
            -ErrorAction Stop
        
        Write-Host "✅ Challenge Generated: $($challengeResponse.challenge)" -ForegroundColor Green
        Write-Host "⏰ Timestamp: $($challengeResponse.timestamp)" -ForegroundColor White
        
        # 5. Test session initialization
        Write-Host "`n5️⃣ Testing Session Initialization..." -ForegroundColor Yellow
        
        $sessionBody = "<mock-signed-xml challenge=`"$($challengeResponse.challenge)`">Test deployment</mock-signed-xml>"
        
        $sessionResponse = Invoke-RestMethod -Uri "$BackendUrl/api/ksef-mock/online/Session/InitSigned" `
            -Method Post `
            -ContentType "application/octet-stream" `
            -Body $sessionBody `
            -ErrorAction Stop
        
        $sessionToken = if ($sessionResponse.sessionToken.token) { $sessionResponse.sessionToken.token } else { $sessionResponse.sessionToken }
        
        Write-Host "✅ Session Created: $($sessionToken.Substring(0, 20))..." -ForegroundColor Green
        Write-Host "📋 Reference: $($sessionResponse.referenceNumber)" -ForegroundColor White
        
        # 6. Test invoice sending
        Write-Host "`n6️⃣ Testing Invoice Send..." -ForegroundColor Yellow
        
        $invoiceBody = @{
            invoiceHash = @{
                hashSHA = @{
                    algorithm = "SHA-256"
                    encoding = "Base64"
                    value = "deployment-test-hash"
                }
                fileSize = 1024
            }
            invoicePayload = @{
                type = "plain"
                invoiceBody = "VGVzdCBkZXBsb3ltZW50IGludm9pY2U=" # base64: "Test deployment invoice"
            }
        } | ConvertTo-Json -Depth 5
        
        $headers = @{
            "Content-Type" = "application/json"
            "SessionToken" = $sessionToken
        }
        
        $invoiceResponse = Invoke-RestMethod -Uri "$BackendUrl/api/ksef-mock/online/Invoice/Send" `
            -Method Put `
            -Headers $headers `
            -Body $invoiceBody `
            -ErrorAction Stop
        
        Write-Host "✅ Invoice Sent: $($invoiceResponse.elementReferenceNumber)" -ForegroundColor Green
        Write-Host "📊 Status: $($invoiceResponse.processingDescription)" -ForegroundColor White
    }
    
    Write-Host "`n🎉 Deployment Test Complete!" -ForegroundColor Green
    
    # Summary
    Write-Host "`n📋 SUMMARY:" -ForegroundColor Cyan
    Write-Host ("="*20) -ForegroundColor Blue
    
    if ($configResponse.mode -eq "mock") {
        Write-Host "✅ Mock KSeF service is running on deployment" -ForegroundColor Green
        Write-Host "🚀 Ready for frontend integration" -ForegroundColor Green
        Write-Host "💡 You can now use the deployed backend for development" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Mock mode not enabled on deployment" -ForegroundColor Red
        Write-Host "💡 Add USE_MOCK_KSEF=true to environment variables" -ForegroundColor Yellow
        Write-Host "🔧 Or contact deployment admin to enable mock mode" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Deployment test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n🔍 Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Check if backend is deployed and accessible" -ForegroundColor White
    Write-Host "2. Verify USE_MOCK_KSEF=true in environment variables" -ForegroundColor White
    Write-Host "3. Check deployment logs for errors" -ForegroundColor White
    Write-Host "4. Ensure all dependencies are installed" -ForegroundColor White
}

Write-Host "`n📝 Usage Examples:" -ForegroundColor Cyan
Write-Host ".\test-deployed.ps1" -ForegroundColor White
Write-Host ".\test-deployed.ps1 -BackendUrl 'http://localhost:3001'" -ForegroundColor White
Write-Host ".\test-deployed.ps1 -BackendUrl 'https://your-backend.com'" -ForegroundColor White
