# Backend Server for KSeF Integration & GUS REGON API

This backend server provides proxy endpoints for KSeF API integration and GUS REGON API for Polish company data lookup, solving CORS issues and providing a secure way to communicate with Polish government systems.

## Features

- **KSeF Integration**: Full KSeF API integration for invoice management
- **GUS REGON API**: Polish company data lookup with NIP/REGON validation
- **Environment Support**: Switch between test, demo, and production environments per request
- **Base64 XML Handling**: Accept XML as base64 for cleaner data transfer
- **Authorization Challenge**: Request challenge for session initialization with XML generation
- **Session Management**: Initialize and terminate KSeF sessions
- **Invoice Operations**: Send invoices and check their status
- **Company Data**: Fetch detailed Polish company information
- **Per-Request Environment Selection**: Choose test or production environment for each API call
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

# Optional: GUS REGON API (for production company data)
GUS_API_KEY=your-registered-gus-api-key
```

For production, change to:
```env
KSEF_API_URL=https://ksef.mf.gov.pl
GUS_API_KEY=your-production-gus-api-key
```

**Note:** The GUS REGON API works without any environment variables and supports per-request environment selection.

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

## 🏢 **GUS REGON API Integration**

The backend provides comprehensive integration with the Polish Central Statistical Office (GUS) REGON API for company data lookup. This service allows you to:

- **Validate NIP and REGON numbers** with checksum verification
- **Search companies by NIP or REGON** with automatic format detection
- **Fetch detailed company information** including addresses, PKD codes, and legal forms
- **Use test or production environments** per request without deployment changes
- **Access real company data** from official Polish government sources

### 🔧 **GUS API Setup**

#### Environment Variables
```env
# Optional - for production API access
GUS_API_KEY=your-registered-api-key-here
# Alternative name for the API key
GUS_USER_KEY=your-registered-api-key-here
```

**Note:** No environment variables are required! The API works out-of-the-box with test data and provides flexible per-request environment selection.

#### API Key Registration
- **Free Registration**: Visit [GUS Registration Portal](https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx)
- **Test Environment**: Works without registration using default test key
- **Production Environment**: Requires free API key registration for real data

### 🚀 **GUS API Usage Examples**

#### Search Company by NIP
```javascript
// Test environment (default)
const response = await fetch('/api/gus/company/nip/5261040828');
const companyData = await response.json();

// Production environment
const response = await fetch('/api/gus/company/nip/5261040828?environment=production');
const companyData = await response.json();

// With detailed information
const response = await fetch('/api/gus/company/nip/5261040828?details=true&environment=test');
const detailedData = await response.json();
```

#### Search Company by REGON
```javascript
// 9-digit REGON
const response = await fetch('/api/gus/company/regon/000331501?environment=test');

// 14-digit REGON
const response = await fetch('/api/gus/company/regon/12345678901234?environment=production');
```

#### Universal Search (Auto-detect NIP/REGON)
```javascript
// Automatically detects if it's NIP (10 digits) or REGON (9/14 digits)
const response = await fetch('/api/gus/search/5261040828?environment=test');
const response = await fetch('/api/gus/search/000331501?environment=production');
```

#### Validate NIP/REGON Numbers
```javascript
const response = await fetch('/api/gus/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nip: '526-104-08-28',
    regon: '000331501'
  })
});

const validation = await response.json();
// Returns validation status with checksum verification
```

### 📊 **Sample Response Data**

```json
{
  "success": true,
  "searchType": "NIP",
  "searchValue": "5261040828",
  "environment": "test",
  "data": {
    "nip": "5261040828",
    "regon": "000331501",
    "name": "GŁÓWNY URZĄD STATYSTYCZNY",
    "shortName": "GUS",
    "street": "AL. NIEPODLEGŁOŚCI",
    "houseNumber": "208",
    "city": "WARSZAWA",
    "postalCode": "00-925",
    "voivodeship": "MAZOWIECKIE",
    "county": "M. ST. WARSZAWA",
    "commune": "MOKOTÓW",
    "pkdMain": "84.11.Z",
    "pkdDescription": "OGÓLNA DZIAŁALNOŚĆ ADMINISTRACJI PUBLICZNEJ",
    "legalForm": "JEDNOSTKA ORGANIZACYJNA NIEMAJĄCA OSOBOWOŚCI PRAWNEJ",
    "registrationDate": "2002-06-05",
    "status": "Czynny"
  },
  "sessionId": "abc123...",
  "timestamp": "2025-08-09T10:30:00Z"
}
```

### 🎯 **Environment Selection**

The GUS API supports flexible per-request environment selection:

- **No parameter**: Uses test environment by default
- **`?environment=test`**: Forces test environment
- **`?environment=production`** or **`?environment=prod`**: Forces production environment

**Example URLs:**
```
GET /api/gus/company/nip/5261040828                    # Test (default)
GET /api/gus/company/nip/5261040828?environment=test   # Test (explicit)
GET /api/gus/company/nip/5261040828?environment=prod   # Production
```

### 🔍 **Available GUS Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gus/config` | GET | API configuration and available features |
| `/api/gus/company/nip/:nip` | GET | Search by NIP number |
| `/api/gus/company/regon/:regon` | GET | Search by REGON number |
| `/api/gus/search/:identifier` | GET | Universal search (auto-detect) |
| `/api/gus/company/:regon/details` | GET | Detailed company information |
| `/api/gus/validate` | POST | Validate NIP/REGON checksums |
| `/api/gus/health` | GET | Service health check |

### 💡 **Query Parameters**

- **`environment`**: `test` | `production` | `prod` (optional, defaults to test)
- **`details`**: `true` | `false` (optional, fetches detailed company info)

### ✅ **Data Validation**

The API includes built-in validation:
- **NIP Checksum**: Validates 10-digit NIP numbers with proper checksum
- **REGON Checksum**: Validates 9 or 14-digit REGON numbers with proper checksum
- **Format Cleaning**: Automatically removes dashes and spaces from input
- **Error Handling**: Clear error messages for invalid formats

This approach is **production-ready** and follows official KSeF patterns! 🎉

## API Endpoints

### KSeF API Endpoints

All KSeF endpoints support an optional `environment` parameter to specify the KSeF environment:
- `"test"` → https://ksef-test.mf.gov.pl (default)
- `"demo"` → https://ksef-demo.mf.gov.pl
- `"prod"` → https://ksef.mf.gov.pl

### GUS REGON API Endpoints

All GUS endpoints support an optional `environment` parameter to specify the GUS environment:
- `"test"` → GUS test environment (default, no API key required)
- `"production"` or `"prod"` → GUS production environment (requires API key for real data)

---

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

---

### GUS REGON API Endpoints

#### GET `/api/gus/config`
Get GUS API configuration and available features

**Response:**
```json
{
  "environment": "flexible (per-request)",
  "defaultEnvironment": "test",
  "apiKeyConfigured": true,
  "features": [
    "Company data by NIP",
    "Company data by REGON", 
    "Per-request environment selection (test/production)"
  ],
  "endpoints": {
    "searchByNIP": "GET /api/gus/company/nip/:nip?environment=test|production&details=true",
    "searchByREGON": "GET /api/gus/company/regon/:regon?environment=test|production&details=true",
    "universalSearch": "GET /api/gus/search/:identifier?environment=test|production&details=true"
  }
}
```

#### GET `/api/gus/company/nip/:nip`
Search company by NIP number

**URL Parameters:** `nip` - 10-digit NIP number (dashes/spaces automatically removed)
**Query Parameters:** 
- `environment` - `test` | `production` | `prod` (optional, defaults to test)
- `details` - `true` | `false` (optional, fetches detailed information)

**Example:** `GET /api/gus/company/nip/5261040828?environment=production&details=true`

**Response:**
```json
{
  "success": true,
  "searchType": "NIP",
  "searchValue": "5261040828",
  "environment": "production",
  "data": {
    "nip": "5261040828",
    "regon": "000331501", 
    "name": "GŁÓWNY URZĄD STATYSTYCZNY",
    "city": "WARSZAWA",
    "postalCode": "00-925",
    "pkdMain": "84.11.Z"
  }
}
```

#### GET `/api/gus/company/regon/:regon`
Search company by REGON number

**URL Parameters:** `regon` - 9 or 14-digit REGON number
**Query Parameters:** Same as NIP search

**Example:** `GET /api/gus/company/regon/000331501?environment=test`

#### GET `/api/gus/search/:identifier`
Universal search - automatically detects NIP (10 digits) or REGON (9/14 digits)

**URL Parameters:** `identifier` - NIP or REGON number
**Query Parameters:** Same as above

**Example:** `GET /api/gus/search/526-104-08-28?details=true&environment=prod`

#### GET `/api/gus/company/:regon/details`
Get detailed company information by REGON

**URL Parameters:** `regon` - REGON number
**Query Parameters:** `environment` - Optional environment selection

**Example:** `GET /api/gus/company/000331501/details?environment=production`

#### POST `/api/gus/validate`
Validate NIP and REGON numbers with checksum verification

**Body:**
```json
{
  "nip": "526-104-08-28",
  "regon": "000331501"
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "nip": {
      "value": "526-104-08-28",
      "valid": true,
      "cleaned": "5261040828",
      "message": "Valid NIP"
    },
    "regon": {
      "value": "000331501", 
      "valid": true,
      "cleaned": "000331501",
      "message": "Valid REGON"
    }
  }
}
```

#### GET `/api/gus/health`
GUS service health check

**Response:**
```json
{
  "status": "healthy",
  "service": "GUS REGON API",
  "environment": "flexible (per-request)",
  "defaultEnvironment": "test",
  "timestamp": "2025-08-09T10:30:00Z"
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

**Available APIs:**
- **KSeF Integration**: `/api/ksef/*` - Polish tax system invoice management
- **GUS REGON API**: `/api/gus/*` - Polish company data lookup

For other hosting platforms:

1. Set environment variables in your hosting platform
2. Update `FRONTEND_URL` to your production frontend URL
3. Choose appropriate `KSEF_API_URL` or use environment parameter
4. Optionally set `GUS_API_KEY` for production company data access
5. Ensure CORS is properly configured for your domain

## Health Check

**GET** `/health` - Returns server status and timestamp
**GET** `/api/gus/health` - Returns GUS REGON API status
