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

## Complete KSeF Authentication & Operations Workflow

### 🔐 **Token Request Flow (Interactive/Semi-Manual)**

This is the **trusted connection establishment** process:

#### Step 1: Request Authorization Challenge
```javascript
const response = await fetch('/api/ksef/authorization-challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextIdentifier: {
      type: 'onip', // or 'operson' for individuals
      identifier: '1234567890' // NIP or PESEL
    },
    environment: 'test'
  })
});

const { xmlToSign } = await response.json();
// User gets base64 XML to decode and sign with ePUAP/qualified certificate
```

#### Step 2: Generate Session Token (After User Signs XML)
```javascript
const response = await fetch('/api/ksef/request-session-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    signedXmlBase64: 'PD94bWwgdmVyc2lvbj0iMS4w...', // Signed XML as base64
    environment: 'test'
  })
});

const { sessionToken } = await response.json();
// Store this token securely - it proves user identity
```

### 🚀 **Authenticated Operations (Token-Based)**

Once you have a session token, use it for all operations:

#### Send Invoice
```javascript
const response = await fetch('/api/ksef/send-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: 'your-session-token',
    invoiceXmlBase64: 'PD94bWwgdmVyc2lvbj0iMS4w...',
    contentType: 'xml',
    environment: 'test'
  })
});
```

#### Query Invoices (View Incoming/Outgoing)
```javascript
const response = await fetch('/api/ksef/query-invoices', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'session-token': 'your-session-token'
  },
  body: JSON.stringify({
    dateFrom: '2025-01-01T00:00:00+00:00',
    dateTo: '2025-01-31T23:59:59+00:00',
    environment: 'test',
    pageSize: 20
  })
});
```

#### Get Specific Invoice
```javascript
const response = await fetch('/api/ksef/invoice/KSEF-ID-HERE?environment=test', {
  headers: { 'session-token': 'your-session-token' }
});

const { invoiceBase64 } = await response.json();
// Decode base64 to get original invoice XML
```

### 🎯 **Your Perfect Use Case Implementation**

1. **Frontend Invoice Generation**: User creates invoice
2. **Token-Based Authentication**: Use stored session token
3. **Send Invoice**: POST to `/send-invoice` with token
4. **View Invoices**: Query incoming/outgoing invoices
5. **Trusted Connection**: Token proves user validity to KSeF

This approach is **production-ready** and follows official KSeF patterns! 🎉

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

### POST `/api/ksef/request-session-token`
Generate session token from signed XML (completes the trusted connection)

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
  "sessionToken": "30AC53BF6313480A4C12278907E718C82086E19FD56DF3F43C889A28572FDD4A",
  "timestamp": "...",
  "referenceNumber": "...",
  "message": "Session token generated successfully. Use this token for all authenticated operations."
}
```

### POST `/api/ksef/query-invoices`
Query invoices (view incoming/outgoing invoices)

**Headers:** `session-token: YOUR_SESSION_TOKEN`
**Body:**
```json
{
  "dateFrom": "2025-01-01T00:00:00+00:00",
  "dateTo": "2025-01-31T23:59:59+00:00",
  "environment": "test",
  "subjectType": "subject1",
  "type": "incremental",
  "pageSize": 10,
  "pageOffset": 0
}
```

### GET `/api/ksef/invoice/:ksefId`
Get specific invoice by KSeF ID

**Headers:** `session-token: YOUR_SESSION_TOKEN`
**URL Parameters:** `ksefId` - KSeF invoice identifier
**Query Parameters:** `environment` - Optional KSeF environment

**Response:**
```json
{
  "ksefId": "1250753505-20230831-1AB5EE5FBF3A-26",
  "invoiceBase64": "PD94bWwgdmVyc2lvbj0iMS4w...",
  "contentType": "application/xml",
  "message": "Invoice retrieved successfully. Decode base64 to get original content."
}
```

### POST `/api/ksef/init-session-token`
Initialize session with token (user provides only NIP, token, and environment)

**Body:**
```json
{
  "nip": "1234567890",
  "authToken": "your-auth-token",
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

**What happens automatically:**
1. **Authorization Challenge** - Fetches challenge and timestamp from KSeF
2. **Public Key Retrieval** - Gets the official KSeF public certificate
3. **Token Encryption** - Encrypts the token with RSA using KSeF's public key
4. **Session Initialization** - Creates and sends proper XML request (aligned with official KSeF samples)

**Note:** This endpoint follows the official KSeF API patterns and uses `application/octet-stream` content type as specified in the official documentation.

### POST `/api/ksef/send-invoice`
Send invoice to KSeF (supports XML, gzipped XML, or ZIP files)

**Body:**
```json
{
  "sessionToken": "...",
  "invoiceXmlBase64": "PD94bWwgdmVyc2lvbj0iMS4w...",
  "environment": "test",
  "contentType": "xml"
}
```

**Content Types:**
- `"xml"` - Plain XML content (default)
- `"gzip"` - Gzipped XML content (will be decompressed)
- `"zip"` - ZIP file with binary data

**Examples:**

Plain XML:
```json
{
  "sessionToken": "...",
  "invoiceXmlBase64": "PD94bWwgdmVyc2lvbj0iMS4w...",
  "contentType": "xml"
}
```

ZIP File:
```json
{
  "sessionToken": "...",
  "invoiceXmlBase64": "UEsDBBQAAAAA...",
  "contentType": "zip"
}
```

Gzipped XML:
```json
{
  "sessionToken": "...",
  "invoiceXmlBase64": "H4sIAAAAAAAAA...",
  "contentType": "gzip"
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

## Smart Certificate Management

The backend intelligently handles KSeF certificates:

- **Automatic Certificate Retrieval**: Fetches official KSeF public keys directly from the specified environment
- **Environment-Aware**: Gets the correct certificate for test/demo/prod environments
- **Fresh Keys**: Always uses the current official KSeF public key
- **User-Friendly**: Users only specify the environment - no certificate management needed
- **Secure**: Certificates are fetched directly from official KSeF APIs

Use `/init-session-token` for the easiest token-based authentication experience.

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

**Binary Data (ZIP Files):**
```javascript
// Reading ZIP file and encoding to base64
const fs = require('fs');
const zipBuffer = fs.readFileSync('invoice.zip');
const base64Zip = zipBuffer.toString('base64');

// Send with contentType: 'zip'
const response = await fetch('/api/ksef/send-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: 'your-session-token',
    invoiceXmlBase64: base64Zip,
    contentType: 'zip',
    environment: 'test'
  })
});
```

**Gzipped XML:**
```javascript
// Compress XML and encode to base64
const zlib = require('zlib');
const xmlString = '<?xml version="1.0"...';
const gzipped = zlib.gzipSync(xmlString);
const base64Gzip = gzipped.toString('base64');

// Send with contentType: 'gzip'
const response = await fetch('/api/ksef/send-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: 'your-session-token',
    invoiceXmlBase64: base64Gzip,
    contentType: 'gzip',
    environment: 'test'
  })
});
```

**Important:** Always use base64 encoding for binary data (ZIP files, compressed content) to prevent HTTP connection corruption.

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
