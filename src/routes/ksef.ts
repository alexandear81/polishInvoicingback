import express, { Request, Response } from 'express';
import axios from 'axios';
import multer from 'multer';
import zlib from 'zlib';
import crypto from 'crypto';
import { getKSeFUrl, isMockMode, getMockHeaders, getRealKSeFHeaders } from '../config/ksef-config.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Configuration endpoint - shows current KSeF mode
router.get('/config', (req: Request, res: Response) => {
  const mockMode = isMockMode();
  const baseUrl = getKSeFUrl();
  
  // Get all relevant environment variables for debugging
  const envVars = {
    USE_MOCK_KSEF: process.env.USE_MOCK_KSEF,
    USE_REAL_KSEF: process.env.USE_REAL_KSEF,
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_URL: process.env.BACKEND_URL,
    KSEF_ENVIRONMENT: process.env.KSEF_ENVIRONMENT
  };
  
  res.json({
    mode: mockMode ? 'mock' : 'real',
    baseUrl,
    environment: process.env.KSEF_ENVIRONMENT || 'test',
    mockEnabled: mockMode,
    version: mockMode ? 'Mock v1.0' : 'Real API v2.4.0',
    message: mockMode 
      ? '🎭 Using Mock KSeF API - Perfect for development!' 
      : '🌐 Using Real KSeF API - Production ready',
    features: mockMode ? [
      'No certificate requirements',
      'Instant responses',
      'Always successful operations',
      'Predictable test data',
      'No rate limiting'
    ] : [
      'Real certificate validation',
      'Actual KSeF integration',
      'Real invoice processing',
      'Production compliance'
    ],
    debug: {
      envVars,
      detectedBackendUrl: process.env.BACKEND_URL || 'auto-detected',
      mockLogic: `USE_MOCK_KSEF !== 'false' && USE_REAL_KSEF !== 'true' = ${mockMode}`,
      timestamp: new Date().toISOString()
    }
  });
});

// KSeF environment URLs
const KSEF_ENVIRONMENTS = {
  test: 'https://ksef-test.mf.gov.pl',
  demo: 'https://ksef-demo.mf.gov.pl',
  prod: 'https://ksef.mf.gov.pl'
};

const getKsefUrl = (environment?: string): string => {
  const env = environment?.toLowerCase() as keyof typeof KSEF_ENVIRONMENTS;
  return KSEF_ENVIRONMENTS[env] || process.env.KSEF_API_URL || KSEF_ENVIRONMENTS.test;
};

// Get KSeF public certificate directly from KSeF API
const getKsefPublicKey = async (environment?: string): Promise<string> => {
  console.log('Fetching KSeF public certificate for environment:', environment || 'test');
  
  try {
    const ksefUrl = getKsefUrl(environment);
    const response = await axios.get(`${ksefUrl}/api/online/Session/AuthorisationChallenge/PublicKey`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PolishInvoicing/1.0'
      },
      timeout: 30000
    });

    const publicKey = response.data.publicKey || response.data;
    console.log('Successfully retrieved KSeF public key');
    return publicKey;
  } catch (error) {
    console.error('Failed to fetch KSeF public key:', error);
    throw new Error('Failed to get KSeF public certificate from official API');
  }
};

// Get authorization challenge from KSeF API
const getAuthorisationChallenge = async (contextIdentifier: { type: string; identifier: string }, environment?: string): Promise<{ challenge: string; timestamp: string }> => {
  console.log('Requesting authorization challenge for:', contextIdentifier.type, contextIdentifier.identifier, 'in environment:', environment || 'test');
  
  try {
    const ksefUrl = getKsefUrl(environment);
    const response = await axios.post(
      `${ksefUrl}/api/online/Session/AuthorisationChallenge`,
      { contextIdentifier },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
      }
    );

    const { challenge, timestamp } = response.data;
    console.log('Successfully received challenge and timestamp from KSeF');
    return { challenge, timestamp };
  } catch (error) {
    console.error('Failed to get authorization challenge:', error);
    throw new Error('Failed to get authorization challenge from KSeF API');
  }
};

// Request authorization challenge and return XML ready for signing
router.post('/authorization-challenge', async (req: Request, res: Response) => {
  try {
    const { contextIdentifier, environment } = req.body;

    if (!contextIdentifier || !contextIdentifier.type || !contextIdentifier.identifier) {
      return res.status(400).json({ 
        error: 'Missing required fields: contextIdentifier.type and contextIdentifier.identifier' 
      });
    }

    // Use the reusable function to get challenge and timestamp
    const { challenge, timestamp } = await getAuthorisationChallenge(contextIdentifier, environment);

    // Create XML structure ready for signing (corrected based on KSeF Java client)
    const xmlToSign = `<?xml version="1.0" encoding="UTF-8"?>
<ns2:AuthRequest xmlns:ns2="http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/2021/10/01/0001" xmlns="http://ksef.mf.gov.pl/schema/gtw/svc/online/types/2021/10/01/0001" xmlns:ns3="http://ksef.mf.gov.pl/schema/gtw/svc/types/2021/10/01/0001">
  <ns2:Context>
    <Challenge>${challenge}</Challenge>
    <Identifier xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="${contextIdentifier.type === 'onip' ? 'ns3:SubjectIdentifierByCompanyType' : 'ns3:SubjectIdentifierToPersonType'}">
      <ns3:Identifier>${contextIdentifier.identifier}</ns3:Identifier>
    </Identifier>
    <DocumentType>
      <ns3:Service>KSeF</ns3:Service>
      <ns3:FormCode>
        <ns3:SystemCode>FA (2)</ns3:SystemCode>
        <ns3:SchemaVersion>1-0E</ns3:SchemaVersion>
        <ns3:TargetNamespace>http://crd.gov.pl/wzor/2023/06/29/12648/</ns3:TargetNamespace>
        <ns3:Value>FA</ns3:Value>
      </ns3:FormCode>
    </DocumentType>
    <Type>SerialNumber</Type>
  </ns2:Context>
</ns2:AuthRequest>`;

    res.json({
      challenge,
      timestamp,
      xmlToSign: Buffer.from(xmlToSign).toString('base64'),
      message: 'XML ready for signing. Decode base64, sign the XML, and upload it to /init-session-signed endpoint.'
    });
  } catch (error: any) {
    console.error('KSeF API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to request authorization challenge',
      details: error.response?.data || error.message
    });
  }
});

// Request session token (after signed XML is received)
router.post('/request-session-token', async (req: Request, res: Response) => {
  try {
    const { signedXmlBase64, environment } = req.body;
    
    console.log('🔐 Processing signed XML for session token...');
    console.log('🌐 Environment:', environment || 'test');

    if (!signedXmlBase64) {
      return res.status(400).json({ 
        error: 'Missing required field: signedXmlBase64' 
      });
    }

    // Decode signed XML
    let signedXmlContent: string;
    try {
      const decodedBuffer = Buffer.from(signedXmlBase64, 'base64');
      signedXmlContent = decodedBuffer.toString('utf-8');
      console.log('✅ Successfully decoded signed XML, length:', signedXmlContent.length);
      console.log('📄 XML preview (first 500 chars):', signedXmlContent.substring(0, 500));
    } catch (error) {
      console.error('❌ Failed to decode base64 XML:', error);
      return res.status(400).json({ 
        error: 'Invalid base64 encoded signed XML' 
      });
    }

    const ksefUrl = getKsefUrl(environment);
    console.log('🎯 KSeF URL:', ksefUrl);

    const response = await axios.post(
      `${ksefUrl}/api/online/Session/InitSigned`,
      signedXmlContent,
      {
        headers: {
          'Content-Type': 'application/octet-stream; charset=utf-8',
          'Accept': 'application/json',
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
      }
    );

    // Extract the session token - this is what user will use for authentication
    const sessionToken = response.data.sessionToken?.token || response.data.sessionToken;
    
    res.json({
      sessionToken,
      timestamp: response.data.timestamp,
      referenceNumber: response.data.referenceNumber,
      message: 'Session token generated successfully. Use this token for all authenticated operations.'
    });
  } catch (error: any) {
    console.error('❌ KSeF Request Session Token Error - Full Details:');
    console.error('📊 Status:', error.response?.status);
    console.error('📄 Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('🔍 Error Message:', error.message);
    console.error('🌐 Request URL:', error.config?.url);
    console.error('📝 Request Headers:', JSON.stringify(error.config?.headers, null, 2));
    
    // If there's a nested exception with details, log that too
    if (error.response?.data?.exception?.exceptionDetailList) {
      console.error('🚨 KSeF Exception Details:');
      error.response.data.exception.exceptionDetailList.forEach((detail: any, index: number) => {
        console.error(`   Detail ${index + 1}:`, JSON.stringify(detail, null, 2));
      });
    }
    
    res.status(error.response?.status || 500).json({
      error: 'Failed to generate session token',
      details: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Query invoices (for viewing incoming/outgoing invoices)
router.post('/query-invoices', async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers['session-token'] as string;
    const { 
      environment, 
      subjectType = 'subject1',
      type = 'incremental', 
      dateFrom, 
      dateTo,
      pageSize = 10,
      pageOffset = 0 
    } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Missing session token in headers' });
    }

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ 
        error: 'Missing required fields: dateFrom and dateTo (ISO format)' 
      });
    }

    const ksefUrl = getKsefUrl(environment);

    const queryCriteria = {
      subjectType,
      type,
      acquisitionTimestampThresholdFrom: dateFrom,
      acquisitionTimestampThresholdTo: dateTo
    };

    const response = await axios.post(
      `${ksefUrl}/api/online/Query/Invoice/Sync?PageSize=${pageSize}&PageOffset=${pageOffset}`,
      { queryCriteria },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'SessionToken': sessionToken,
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('KSeF Query Invoices Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to query invoices',
      details: error.response?.data || error.message
    });
  }
});

// Get specific invoice by KSeF ID
router.get('/invoice/:ksefId', async (req: Request, res: Response) => {
  try {
    const { ksefId } = req.params;
    const sessionToken = req.headers['session-token'] as string;
    const environment = req.query.environment as string;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Missing session token in headers' });
    }

    const ksefUrl = getKsefUrl(environment);

    const response = await axios.get(
      `${ksefUrl}/api/online/Invoice/Get/${ksefId}`,
      {
        headers: {
          'Accept': 'application/octet-stream',
          'SessionToken': sessionToken,
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000,
        responseType: 'arraybuffer'
      }
    );

    // Return invoice as base64 for safe transport
    const base64Invoice = Buffer.from(response.data).toString('base64');
    
    res.json({
      ksefId,
      invoiceBase64: base64Invoice,
      contentType: response.headers['content-type'] || 'application/xml',
      message: 'Invoice retrieved successfully. Decode base64 to get original content.'
    });
  } catch (error: any) {
    console.error('KSeF Get Invoice Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to get invoice',
      details: error.response?.data || error.message
    });
  }
});

// Initialize session with token (simplified - user provides NIP, token, environment)
router.post('/init-session-token', async (req: Request, res: Response) => {
  try {
    const { nip, authToken, environment } = req.body;

    if (!nip || !authToken) {
      return res.status(400).json({ 
        error: 'Missing required fields: nip and authToken' 
      });
    }

    console.log('Initializing token session for NIP:', nip, 'in environment:', environment || 'test');

    // Step 1: Get authorization challenge using reusable function
    const { challenge, timestamp } = await getAuthorisationChallenge({
      type: 'onip',
      identifier: nip
    }, environment);

    // Step 2: Get KSeF public key
    const publicKey = await getKsefPublicKey(environment);

    // Step 3: Create and encrypt the token
    const tokenString = `${timestamp}|${authToken}`;
    const encryptedToken = crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(tokenString, 'utf-8')).toString('base64');

    console.log('Token encrypted with KSeF public key');

    // Step 4: Create XML for token-based initialization
    const xmlToSend = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ns3:InitSessionTokenRequest xmlns="http://ksef.mf.gov.pl/schema/gtw/svc/online/types/2021/10/01/0001" xmlns:ns2="http://ksef.mf.gov.pl/schema/gtw/svc/types/2021/10/01/0001" xmlns:ns3="http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/2021/10/01/0001">
  <ns3:Context>
    <Challenge>${challenge}</Challenge>
    <Identifier xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ns2:SubjectIdentifierByCompanyType">
      <ns2:Identifier>${nip}</ns2:Identifier>
    </Identifier>
    <DocumentType>
      <ns2:Service>KSeF</ns2:Service>
      <ns2:FormCode>
        <ns2:SystemCode>FA (2)</ns2:SystemCode>
        <ns2:SchemaVersion>1-0E</ns2:SchemaVersion>
        <ns2:TargetNamespace>http://crd.gov.pl/wzor/2023/06/29/12648/</ns2:TargetNamespace>
        <ns2:Value>FA</ns2:Value>
      </ns2:FormCode>
    </DocumentType>
    <Token>${encryptedToken}</Token>
  </ns3:Context>
</ns3:InitSessionTokenRequest>`;

    // Step 5: Initialize session with token
    const ksefUrl = getKsefUrl(environment);
    const response = await axios.post(
      `${ksefUrl}/api/online/Session/InitToken`,
      xmlToSend,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'application/json',
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
      }
    );

    res.json({
      sessionToken: response.data.sessionToken?.token || response.data.sessionToken || response.data,
      timestamp: response.data.timestamp,
      referenceNumber: response.data.referenceNumber,
      rawResponse: response.data
    });
  } catch (error: any) {
    console.error('KSeF Init Token Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to initialize session with token',
      details: error.response?.data || error.message
    });
  }
});

// Initialize session with signed request (base64 encoded XML)
router.post('/init-session-signed', upload.single('signedXml'), async (req: Request, res: Response) => {
  try {
    const { signedXmlBase64, environment, compressed = false } = req.body;
    let signedXmlContent: string;

    // Support base64 encoded XML (primary method) or file upload (fallback)
    if (signedXmlBase64) {
      try {
        const decodedBuffer = Buffer.from(signedXmlBase64, 'base64');
        
        if (compressed) {
          // Decompress gzipped content
          signedXmlContent = zlib.gunzipSync(decodedBuffer).toString('utf-8');
        } else {
          // Direct conversion to string
          signedXmlContent = decodedBuffer.toString('utf-8');
        }
      } catch (error) {
        return res.status(400).json({ 
          error: compressed ? 'Invalid compressed base64 encoded XML' : 'Invalid base64 encoded XML' 
        });
      }
    } else if (req.file) {
      signedXmlContent = req.file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ 
        error: 'No signed XML provided. Use signedXmlBase64 field with base64 encoded XML' 
      });
    }

    const ksefUrl = getKsefUrl(environment);

    const response = await axios.post(
      `${ksefUrl}/api/online/Session/InitSigned`,
      signedXmlContent,
      {
        headers: {
          'Content-Type': 'application/octet-stream; charset=utf-8',
          'Accept': 'application/json',
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
      }
    );

    // Return the session token and other response data
    res.json({
      sessionToken: response.data.sessionToken,
      timestamp: response.data.timestamp,
      referenceNumber: response.data.referenceNumber
    });
  } catch (error: any) {
    console.error('KSeF Init Session Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to initialize session',
      details: error.response?.data || error.message
    });
  }
});

// Send invoice
router.post('/send-invoice', async (req: Request, res: Response) => {
  try {
    const { sessionToken, invoiceXmlBase64, environment, contentType = 'xml' } = req.body;

    if (!sessionToken || !invoiceXmlBase64) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionToken and invoiceXmlBase64' 
      });
    }

    // Validate contentType parameter
    const validContentTypes = ['xml', 'gzip', 'zip'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}` 
      });
    }

    let contentToSend: string | Buffer;
    let httpContentType: string;

    try {
      const decodedBuffer = Buffer.from(invoiceXmlBase64, 'base64');
      
      switch (contentType) {
        case 'zip':
          // ZIP file - send as binary data
          contentToSend = decodedBuffer;
          httpContentType = 'application/zip';
          console.log('Sending ZIP file with size:', decodedBuffer.length, 'bytes');
          break;
          
        case 'gzip':
          // Gzipped XML - decompress first
          contentToSend = zlib.gunzipSync(decodedBuffer).toString('utf-8');
          httpContentType = 'application/xml';
          console.log('Sending decompressed XML content');
          break;
          
        case 'xml':
        default:
          // Plain XML - convert to string
          contentToSend = decodedBuffer.toString('utf-8');
          httpContentType = 'application/xml';
          console.log('Sending plain XML content');
          break;
      }
    } catch (error) {
      return res.status(400).json({ 
        error: `Invalid base64 encoded ${contentType} content: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }

    const ksefUrl = getKsefUrl(environment);

    const response = await axios.post(
      `${ksefUrl}/api/online/Invoice/Send`,
      contentToSend,
      {
        headers: {
          'Content-Type': httpContentType,
          'Accept': 'application/json',
          'SessionToken': sessionToken,
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000,
        // Ensure binary data is handled properly
        responseType: 'json',
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    res.json({
      elementReferenceNumber: response.data.elementReferenceNumber,
      processingCode: response.data.processingCode,
      processingDescription: response.data.processingDescription,
      timestamp: response.data.timestamp
    });
  } catch (error: any) {
    console.error('KSeF Send Invoice Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to send invoice',
      details: error.response?.data || error.message
    });
  }
});

// Get invoice status
router.get('/invoice-status/:referenceNumber', async (req: Request, res: Response) => {
  try {
    const { referenceNumber } = req.params;
    const sessionToken = req.headers['session-token'] as string;
    const environment = req.query.environment as string;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Missing session token in headers' });
    }

    const ksefUrl = getKsefUrl(environment);

    const response = await axios.get(
      `${ksefUrl}/api/online/Invoice/Status/${referenceNumber}`,
      {
        headers: {
          'Accept': 'application/json',
          'SessionToken': sessionToken,
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('KSeF Get Status Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to get invoice status',
      details: error.response?.data || error.message
    });
  }
});

// Terminate session
router.post('/terminate-session', async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers['session-token'] as string;
    const { environment } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Missing session token in headers' });
    }

    const ksefUrl = getKsefUrl(environment);

    const response = await axios.post(
      `${ksefUrl}/api/online/Session/Terminate`,
      {},
      {
        headers: {
          'Accept': 'application/json',
          'SessionToken': sessionToken,
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
      }
    );

    res.json({ message: 'Session terminated successfully', timestamp: response.data.timestamp });
  } catch (error: any) {
    console.error('KSeF Terminate Session Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to terminate session',
      details: error.response?.data || error.message
    });
  }
});

export { router as ksefRoutes };
