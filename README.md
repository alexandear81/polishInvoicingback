# Backend Server for KSeF Integration

This backend server provides proxy endpoints for KSeF API integration, solving CORS issues and providing a secure way to communicate with the Polish tax system.

## Features

- **Authorization Challenge**: Request challenge for session initialization
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

### POST `/api/ksef/authorization-challenge`
Request authorization challenge from KSeF

**Body:**
```json
{
  "contextIdentifier": {
    "type": "onip",
    "identifier": "1234567890"
  }
}
```

**Response:**
```json
{
  "challenge": "...",
  "timestamp": "..."
}
```

### POST `/api/ksef/init-session-signed`
Initialize session with signed XML

**Body:** `multipart/form-data` with `signedXml` file

**Response:**
```json
{
  "sessionToken": "...",
  "timestamp": "...",
  "referenceNumber": "..."
}
```

### POST `/api/ksef/send-invoice`
Send invoice to KSeF

**Headers:** `session-token: YOUR_SESSION_TOKEN`

**Body:**
```json
{
  "sessionToken": "...",
  "invoiceXml": "..."
}
```

### GET `/api/ksef/invoice-status/:referenceNumber`
Get invoice processing status

**Headers:** `session-token: YOUR_SESSION_TOKEN`

### POST `/api/ksef/terminate-session`
Terminate active session

**Headers:** `session-token: YOUR_SESSION_TOKEN`

## Development Workflow

1. Start backend: `npm run dev` (runs on port 3001)
2. Start frontend: `npm run dev` (runs on port 5173)
3. Frontend makes requests to `http://localhost:3001/api/ksef/*`
4. Backend proxies to KSeF API with proper headers and error handling

## Deployment

The backend can be deployed to any Node.js hosting service (Vercel, Railway, Heroku, etc.). Make sure to:

1. Set environment variables in your hosting platform
2. Update `FRONTEND_URL` to your production frontend URL
3. Change `KSEF_API_URL` to production KSeF endpoint
4. Ensure CORS is properly configured for your domain
