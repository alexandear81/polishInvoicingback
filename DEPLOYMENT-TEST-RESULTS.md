# Quick Manual Tests for Deployed Backend

## Backend Status ✅
Your backend at `https://polishinvoicingback-1.onrender.com` is **running successfully**!

- ✅ **Status**: OK  
- ⏰ **Uptime**: 140+ seconds  
- 🌍 **Environment**: production  
- 🎭 **Current Mode**: real (KSeF API)  

## Issue Found 🔍
The backend is currently configured to use the **real KSeF API** instead of our mock service. This means:
- Mock endpoints are not available (404 errors)
- It would try to connect to `https://ksef-test.mf.gov.pl/api`
- Certificate trust issues would still occur

## Solution: Enable Mock Mode 🔧

### Option 1: Environment Variable (Recommended)
Add this environment variable to your deployment platform:
```
USE_MOCK_KSEF=true
```

**For Render.com:**
1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add new environment variable:
   - **Key**: `USE_MOCK_KSEF`
   - **Value**: `true`
4. Save and redeploy

**For other platforms:**
- **Heroku**: `heroku config:set USE_MOCK_KSEF=true`
- **Railway**: Add in Environment Variables section
- **Vercel**: Add in Environment Variables settings

### Option 2: Manual Testing
You can test individual endpoints by making HTTP requests to:

```bash
# Test the config endpoint
curl https://polishinvoicingback-1.onrender.com/api/ksef/config

# After enabling mock mode, test mock health
curl https://polishinvoicingback-1.onrender.com/api/ksef-mock/health

# Test authorization challenge (after mock mode enabled)
curl -X POST https://polishinvoicingback-1.onrender.com/api/ksef-mock/online/Session/AuthorisationChallenge \
  -H "Content-Type: application/json" \
  -d '{"contextIdentifier":{"type":"onip","identifier":"1111111111"}}'
```

## Expected Result After Fix ✨

After enabling `USE_MOCK_KSEF=true`, you should see:
- 🎭 **Mode**: mock
- 📡 **Base URL**: http://localhost:3001/api/ksef-mock
- 💬 **Message**: 🎭 Using Mock KSeF Service - Development mode  
- ✅ Mock endpoints available (no more 404 errors)
- 🚀 Full KSeF workflow working without certificates

## Test Commands (After Fix)

```bash
# Windows PowerShell
.\test-deployed-fixed.ps1

# Node.js
node test-deployed-mock.js

# Manual curl tests
curl https://polishinvoicingback-1.onrender.com/api/ksef-mock/health
```

## Next Steps 📋

1. **Enable mock mode** using environment variable
2. **Redeploy** your backend service  
3. **Re-run tests** to verify mock service is working
4. **Integrate with frontend** once confirmed working

The backend architecture is solid - just needs the environment configuration! 🎯
