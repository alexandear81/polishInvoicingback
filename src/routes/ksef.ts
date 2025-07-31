import express, { Request, Response } from 'express';
import axios from 'axios';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const KSEF_API_URL = process.env.KSEF_API_URL || 'https://ksef-test.mf.gov.pl';

// Request authorization challenge and return XML ready for signing
router.post('/authorization-challenge', async (req: Request, res: Response) => {
  try {
    const { contextIdentifier } = req.body;

    if (!contextIdentifier || !contextIdentifier.type || !contextIdentifier.identifier) {
      return res.status(400).json({ 
        error: 'Missing required fields: contextIdentifier.type and contextIdentifier.identifier' 
      });
    }

    const response = await axios.post(
      `${KSEF_API_URL}/api/online/Session/AuthorisationChallenge`,
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

    // Create XML structure ready for signing
    const xmlToSign = `<?xml version="1.0" encoding="UTF-8"?>
<InitSessionSignedRequest xmlns="http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/2021/10/01/0001">
  <Context>
    <Challenge>${challenge}</Challenge>
    <Identifier xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="${contextIdentifier.type === 'onip' ? 'SubjectIdentifierByCompanyType' : 'SubjectIdentifierToPersonType'}">
      <Identifier>${contextIdentifier.identifier}</Identifier>
    </Identifier>
    <DocumentType>
      <Service>KSeF</Service>
      <FormCode>
        <SystemCode>FA (2)</SystemCode>
        <SchemaVersion>1-0E</SchemaVersion>
        <TargetNamespace>http://crd.gov.pl/wzor/2023/06/29/12648/</TargetNamespace>
        <Value>FA</Value>
      </FormCode>
    </DocumentType>
    <RequestTimestamp>${timestamp}</RequestTimestamp>
  </Context>
</InitSessionSignedRequest>`;

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

// Initialize session with signed request
router.post('/init-session-signed', upload.single('signedXml'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No signed XML file provided' });
    }

    const signedXmlContent = req.file.buffer.toString('utf-8');

    const response = await axios.post(
      `${KSEF_API_URL}/api/online/Session/InitSessionSignedRequest`,
      signedXmlContent,
      {
        headers: {
          'Content-Type': 'application/xml',
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
    const { sessionToken, invoiceXml } = req.body;

    if (!sessionToken || !invoiceXml) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionToken and invoiceXml' 
      });
    }

    const response = await axios.post(
      `${KSEF_API_URL}/api/online/Invoice/Send`,
      invoiceXml,
      {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
          'SessionToken': sessionToken,
          'User-Agent': 'PolishInvoicing/1.0'
        },
        timeout: 30000
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

    if (!sessionToken) {
      return res.status(400).json({ error: 'Missing session token in headers' });
    }

    const response = await axios.get(
      `${KSEF_API_URL}/api/online/Invoice/Status/${referenceNumber}`,
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

    if (!sessionToken) {
      return res.status(400).json({ error: 'Missing session token in headers' });
    }

    const response = await axios.post(
      `${KSEF_API_URL}/api/online/Session/Terminate`,
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
