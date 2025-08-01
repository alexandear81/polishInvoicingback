# Frontend Integration Files

This folder contains ready-to-use frontend integration code for your KSeF backend API.

## 📁 Files Included

### 1. `ksefService.js` - **JavaScript Version**
- ✅ **Ready for any JavaScript frontend** (React, Vue, Vanilla JS)
- ✅ **Complete KSeF API integration**
- ✅ **Error handling and timeout management**
- ✅ **Base64 utilities for XML handling**

### 2. `ksefService.ts` - **TypeScript Version**  
- ✅ **Full TypeScript support with interfaces**
- ✅ **Type-safe API calls**
- ✅ **IntelliSense and autocompletion**
- ✅ **All features from JavaScript version + types**

### 3. `useKsef.template.tsx` - **React Hook Template**
- ✅ **Template file for React projects**
- ✅ **State management (loading, errors, data)**
- ✅ **Easy authentication flow**
- ✅ **Invoice operations with pagination**
- ✅ **Copy-paste ready with instructions**

## 🚀 Quick Start

### For JavaScript Projects:
```javascript
// Copy ksefService.js to your frontend project
import ksefService from './ksefService.js';

// Basic usage
const challenge = await ksefService.requestAuthorizationChallenge('1234567890');
```

### For TypeScript Projects:
```typescript
// Copy ksefService.ts to your frontend project
import ksefService from './ksefService';

// Type-safe usage
const challenge: AuthorizationChallengeResponse = await ksefService.requestAuthorizationChallenge('1234567890');
```

### For React Projects:
```jsx
// Copy useKsef.template.tsx to your React project
// Rename it to useKsef.tsx and follow the instructions inside
import { useKsef } from './useKsef';

function MyComponent() {
  const { isAuthenticated, requestChallenge, sendInvoice } = useKsef();
  // Use the hook...
}
```

## 🔧 Configuration

Update the `BACKEND_URL` in the service files to match your deployment:

```javascript
const API_CONFIG = {
  // Choose your backend URL:
  BACKEND_URL: 'https://polishinvoicingback-1.onrender.com', // Production
  // BACKEND_URL: 'http://localhost:3001', // Local development
  
  DEFAULT_ENVIRONMENT: 'test', // or 'demo', 'prod'
  TIMEOUT: 30000
};
```

## 📋 Installation Requirements

### For the JavaScript version:
- No additional dependencies required
- Works with any modern JavaScript environment

### For the TypeScript version:
- TypeScript 4.0+
- No additional runtime dependencies

### For the React Hook:
- React 16.8+ (hooks support)
- TypeScript (optional but recommended)

## 🎯 Complete Workflow Example

```javascript
// 1. Initialize service
import ksefService from './ksefService';
ksefService.setEnvironment('test');

// 2. Authentication flow
const challenge = await ksefService.requestAuthorizationChallenge('1234567890');
// User signs the XML...
const auth = await ksefService.completeAuthentication(signedXmlBase64);

// 3. Send invoice
const xmlContent = '<?xml version="1.0"...';
const base64Xml = ksefService.xmlToBase64(xmlContent);
const result = await ksefService.sendInvoice(base64Xml);

// 4. Query invoices
const invoices = await ksefService.queryInvoices(
  '2025-01-01T00:00:00+00:00',
  '2025-01-31T23:59:59+00:00'
);
```

## 🌍 Environment Support

All services support switching between KSeF environments:

```javascript
// Test environment (default)
ksefService.setEnvironment('test');

// Demo environment  
ksefService.setEnvironment('demo');

// Production environment
ksefService.setEnvironment('prod');
```

## 🛡️ Security Features

- ✅ **CORS Protection**: Backend configured for your domains
- ✅ **Request Timeout**: 30-second timeout prevents hanging requests
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Token Management**: Secure session token handling
- ✅ **Input Validation**: Type checking and validation

## 📱 Frontend Deployments Supported

Your backend is already configured to work with:

- ✅ **Vercel**: `https://polish-invoicingfront.vercel.app`
- ✅ **Firebase**: `https://polishinvoicing.firebaseapp.com`  
- ✅ **Local Development**: `localhost:3000`, `localhost:5173`, etc.

## 🔍 Debugging

The services include comprehensive logging:

```javascript
// Browser console will show:
// 🌐 Making request to: https://polishinvoicingback-1.onrender.com/api/ksef/...
// ✅ Authorization challenge received
// ✅ Invoice sent successfully
// ❌ Failed to send invoice: HTTP 400: Invalid XML
```

## 📖 API Reference

All services provide these methods:

### Authentication:
- `requestAuthorizationChallenge(nip, userType)`
- `completeAuthentication(signedXmlBase64)`
- `initializeSessionWithToken(nip, authToken)`

### Invoice Operations:
- `sendInvoice(invoiceXmlBase64, contentType)`
- `queryInvoices(dateFrom, dateTo, options)`
- `getInvoice(ksefId)`
- `getInvoiceStatus(referenceNumber)`

### Utilities:
- `checkHealth()`
- `isAuthenticated()`
- `getSessionInfo()`
- `xmlToBase64(xmlString)` / `base64ToXml(base64String)`

## 🎉 Ready to Use!

These files are production-ready and can be directly copied to your frontend project. They provide complete integration with your KSeF backend API with proper error handling, TypeScript support, and React hooks for easy state management.

Choose the version that best fits your project:
- **JavaScript**: Universal compatibility  
- **TypeScript**: Type safety and better DX
- **React Hook**: State management and React integration

Happy coding! 🚀
