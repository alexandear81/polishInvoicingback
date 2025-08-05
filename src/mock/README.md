# KSeF Mock Service

A comprehensive mock implementation of the Polish KSeF (Krajowy System e-Faktur) API based on the official OpenAPI specification. Perfect for development when the real API is not available or when you want to avoid certificate complexities.

## 🎯 Why Use the Mock Service?

### Real KSeF API Challenges
- **Certificate Requirements**: Requires valid Polish certificates or complex self-signed setup
- **31000 Errors**: Certificate trust issues we discovered in our investigation
- **Rate Limiting**: Limited requests for testing
- **Availability**: New API version not available until October 2025
- **Complexity**: Complex XML signing and validation

### Mock Service Benefits
- ✅ **No Certificates Required**: Skip complex certificate setup
- ✅ **Instant Responses**: No network delays or timeouts
- ✅ **Always Works**: No 31000 errors or authentication issues
- ✅ **Predictable Data**: Consistent test data for development
- ✅ **Full Coverage**: All endpoints from OpenAPI spec implemented
- ✅ **Development Speed**: Focus on frontend without backend complexity

## 🚀 Quick Start

### 1. Enable Mock Mode

Add to your `.env` file:
```bash
USE_MOCK_KSEF=true
NODE_ENV=development
```

### 2. Start the Server

The mock service automatically starts with your backend in development mode.

### 3. Check Configuration

Visit `http://localhost:3001/api/ksef/config` to confirm mock mode:

```json
{
  "mode": "mock",
  "baseUrl": "http://localhost:3001/api/ksef-mock",
  "mockEnabled": true,
  "message": "🎭 Using Mock KSeF API - Perfect for development!",
  "features": [
    "No certificate requirements",
    "Instant responses",
    "Always successful operations",
    "Predictable test data",
    "No rate limiting"
  ]
}
```

## 📡 Available Endpoints

### Session Management
- `POST /api/ksef-mock/online/Session/AuthorisationChallenge` - Get authentication challenge
- `POST /api/ksef-mock/online/Session/InitSigned` - Initialize with signed XML
- `POST /api/ksef-mock/online/Session/InitToken` - Initialize with token
- `GET /api/ksef-mock/online/Session/Status` - Check session status
- `GET /api/ksef-mock/online/Session/Terminate` - End session

### Invoice Management
- `PUT /api/ksef-mock/online/Invoice/Send` - Send invoice
- `GET /api/ksef-mock/online/Invoice/Status/:referenceNumber` - Check invoice status
- `GET /api/ksef-mock/online/Invoice/Get/:ksefReferenceNumber` - Download invoice

### Query Operations
- `POST /api/ksef-mock/online/Query/Invoice/Sync` - Query invoices

### Credentials (Basic)
- `POST /api/ksef-mock/online/Credentials/GenerateToken` - Generate auth token

### Health Check
- `GET /api/ksef-mock/health` - Service health and statistics

## 🔄 Workflow Examples

### Complete Invoice Workflow

```typescript
// 1. Get authentication challenge
const challengeResponse = await fetch('/api/ksef-mock/online/Session/AuthorisationChallenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextIdentifier: { type: 'onip', identifier: '1111111111' }
  })
});

// 2. Initialize session (mock doesn't require real signing)
const sessionResponse = await fetch('/api/ksef-mock/online/Session/InitSigned', {
  method: 'POST',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: '<mock-signed-xml>...</mock-signed-xml>'
});

const { sessionToken } = await sessionResponse.json();

// 3. Send invoice
const invoiceResponse = await fetch('/api/ksef-mock/online/Invoice/Send', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'SessionToken': sessionToken.token
  },
  body: JSON.stringify({
    invoiceHash: { /* mock invoice data */ }
  })
});

// 4. Check status
const statusResponse = await fetch(`/api/ksef-mock/online/Invoice/Status/${elementReferenceNumber}`, {
  headers: { 'SessionToken': sessionToken.token }
});
```

## 🎛️ Mock Behavior

### Session Tokens
- Always generates valid tokens
- Tokens persist in memory during server run
- No expiration (for development convenience)

### Invoice Processing
- All invoices are immediately accepted
- Status progression: `processing` → `accepted` (after 2 minutes)
- Generates realistic KSeF reference numbers

### Error Simulation
- Returns proper error format matching OpenAPI spec
- Handles missing authentication appropriately
- Validates required fields

### Data Generation
- Realistic Polish NIP numbers
- Proper date formatting
- Valid reference number patterns
- Consistent mock data across requests

## 🔧 Configuration Options

### Environment Variables

```bash
# Mock Service Control
USE_MOCK_KSEF=true                    # Enable/disable mock
NODE_ENV=development                  # Auto-enables mock in development

# Real API Fallback
KSEF_ENVIRONMENT=test                 # test|demo|prod
BACKEND_URL=http://localhost:3001     # Your backend URL
```

### Switching to Real API

When ready for real KSeF integration:

1. Set `USE_MOCK_KSEF=false`
2. Ensure certificates are properly configured
3. Update `KSEF_ENVIRONMENT` as needed
4. Test with the real endpoints

## 📊 Monitoring and Debugging

### Health Endpoint

`GET /api/ksef-mock/health` returns:

```json
{
  "status": "healthy",
  "service": "KSeF Mock Server",
  "version": "1.0.0",
  "activeSessions": 3,
  "storedInvoices": 15,
  "timestamp": "2025-08-05T10:30:00.000Z"
}
```

### Request Logging

All mock requests are logged with:
- HTTP method and URL
- Request headers
- Request body (truncated for readability)
- Generated response data

## 🎯 Development Tips

### Frontend Development
- Use mock mode for rapid UI development
- Test all success/error scenarios
- No need to worry about certificates or authentication

### Backend Testing
- Mock provides consistent responses for automated tests
- Test error handling with predictable failures
- Validate request/response formats

### Integration Testing
- Switch between mock and real API easily
- Use mock for CI/CD pipelines
- Real API for final validation

## 🔍 OpenAPI Compliance

The mock service implements endpoints from `KSeF-online.yaml`:
- ✅ Proper HTTP status codes
- ✅ Correct response schemas
- ✅ Error format matching
- ✅ Request validation
- ✅ Header handling

## 🚨 Limitations

### Mock-Specific Behavior
- No real certificate validation
- Simplified business logic
- In-memory storage (data lost on restart)
- No advanced KSeF features

### Not Implemented
- Complex credential workflows
- Advanced query filtering
- Real encryption/decryption
- Full audit trail

## 🔄 Migration Path

1. **Development Phase**: Use mock for all development
2. **Integration Phase**: Test key workflows with real API
3. **Testing Phase**: Validate with mock + real API
4. **Production Phase**: Switch to real API only

This mock service eliminates the certificate trust issues we discovered in our investigation and provides a smooth development experience until the new KSeF API version is available in October!
