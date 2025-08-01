# Backend Server for KSeF Integration

This backend server provides proxy endpoints for KSeF API integration, solving CORS issues and providing a secure way to communicate with the Polish tax system.

## Features

- **Environment Support**: Switch between test, demo, and production KSeF environments
- **Base64 XML Handling**: Accept XML as base64 for cleaner data transfer
- **Authorization Challenge**: Request challenge for session initialization with XML generation
- **Session Management**: Initialize and terminate KSeF sessions
- **Invoice Operations**: Send invoices and check their status
- **Error Handling**: Comprehensive error handling and logging
- **Security**: CORS protection, helmet security headers, compression

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy `.env` file and configure:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
KSEF_API_URL=https://ksef-test.mf.gov.pl
```

For production, change to:
```env
KSEF_API_URL=https://ksef.mf.gov.pl
```

### 3. Development

```bash
npm run dev
```

### 4. Production

```bash
npm run build
npm start
```

## API Endpoints

All endpoints support an optional `environment` parameter to specify the KSeF environment:
- `"test"` → https://ksef-test.mf.gov.pl (default)
- `"demo"` → https://ksef-demo.mf.gov.pl
- `"prod"` → https://ksef.mf.gov.pl

### POST `/api/ksef/authorization-challenge`
Request authorization challenge from KSeF and get XML ready for signing

**Body:**
```json
{
  "contextIdentifier": {
    "type": "onip",
    "identifier": "1234567890"
  },
  "environment": "test"
}
```

**Response:**
```json
{
  "challenge": "20250801-CR-F7A90D626B-11474323A0-20",
  "timestamp": "2025-07-31T22:00:36.977Z",
  "xmlToSign": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...",
  "message": "XML ready for signing. Decode base64, sign the XML, and upload it to /init-session-signed endpoint."
}
```

### POST `/api/ksef/init-session-signed`
Initialize session with signed XML (base64 encoded)

**Body:**
```json
{
  "signedXmlBase64": "PD94bWwgdmVyc2lvbj0iMS4w...",
  "environment": "test"
}
```

**Response:**
```json
{
  "sessionToken": "...",
  "timestamp": "...",
  "referenceNumber": "..."
}
```

### POST `/api/ksef/send-invoice`
Send invoice to KSeF (base64 encoded XML)

**Body:**
```json
{
  "sessionToken": "...",
  "invoiceXmlBase64": "PD94bWwgdmVyc2lvbj0iMS4w...",
  "environment": "test"
}
```

### GET `/api/ksef/invoice-status/:referenceNumber`
Get invoice processing status

**URL Parameters:** `referenceNumber` - Invoice reference number
**Query Parameters:** `environment` - Optional KSeF environment
**Headers:** `session-token: YOUR_SESSION_TOKEN`

Example: `GET /api/ksef/invoice-status/REF123?environment=test`

### POST `/api/ksef/terminate-session`
Terminate active session

**Headers:** `session-token: YOUR_SESSION_TOKEN`
**Body:**
```json
{
  "environment": "test"
}
```

## Development Workflow

1. Start backend: `npm run dev` (runs on port 3001)
2. Start frontend: `npm run dev` (runs on port 5173)
3. Frontend makes requests to `http://localhost:3001/api/ksef/*`
4. Backend proxies to KSeF API with proper headers and error handling

## Base64 XML Handling

For better data integrity and cleaner JSON responses, the API supports base64 encoded XML:

**Encoding XML to Base64 (JavaScript):**
```javascript
const base64Xml = Buffer.from(xmlString).toString('base64');
```

**Decoding Base64 to XML (JavaScript):**
```javascript
const xmlString = Buffer.from(base64String, 'base64').toString('utf-8');
```

## Environment Switching

Use the `environment` parameter to switch between KSeF environments:

```javascript
// Test environment (default)
const response = await fetch('/api/ksef/authorization-challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextIdentifier: { type: 'onip', identifier: '1234567890' },
    environment: 'test'
  })
});

// Production environment
const response = await fetch('/api/ksef/authorization-challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextIdentifier: { type: 'onip', identifier: '1234567890' },
    environment: 'prod'
  })
});
```

## Deployment

The backend is deployed at: **https://polishinvoicingback-1.onrender.com**

For other hosting platforms:

1. Set environment variables in your hosting platform
2. Update `FRONTEND_URL` to your production frontend URL
3. Choose appropriate `KSEF_API_URL` or use environment parameter
4. Ensure CORS is properly configured for your domain

## Health Check

**GET** `/health` - Returns server status and timestamp
