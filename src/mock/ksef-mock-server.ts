import express, { Request, Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// Mock data storage
const mockSessions = new Map<string, any>();
const mockInvoices = new Map<string, any>();
const mockCredentials = new Map<string, any>();

// Utility functions for generating mock data
const generateReferenceNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = (length: number) => crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
  
  return `${dateStr}-SE-${randomHex(10)}-${randomHex(10)}-${randomHex(2)}`;
};

const generateKSeFNumber = (nip: string): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
  
  return `${nip}-${dateStr}-${randomHex.slice(0, 6)}-${randomHex.slice(6, 12)}-${randomHex.slice(12, 14)}`;
};

const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('base64');
};

const generateChallenge = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = (length: number) => crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
  
  return `${dateStr}-CR-${randomHex(10)}-${randomHex(10)}-${randomHex(2)}`;
};

// Mock response templates
const createSuccessResponse = (data: any) => ({
  timestamp: new Date().toISOString(),
  referenceNumber: generateReferenceNumber(),
  ...data
});

const createErrorResponse = (code: number, description: string, serviceCtx = 'srvMOCK') => ({
  exception: {
    serviceCtx,
    serviceCode: generateReferenceNumber(),
    serviceName: 'mock.service',
    timestamp: new Date().toISOString(),
    referenceNumber: generateReferenceNumber(),
    exceptionDetailList: [{
      exceptionCode: code,
      exceptionDescription: description
    }]
  }
});

// Session endpoints
router.post('/online/Session/AuthorisationChallenge', (req: Request, res: Response) => {
  console.log('🎯 Mock: AuthorisationChallenge called');
  const { contextIdentifier } = req.body;
  
  if (!contextIdentifier || !contextIdentifier.type || !contextIdentifier.identifier) {
    return res.status(400).json(createErrorResponse(21001, 'Brak wymaganych danych kontekstowych'));
  }
  
  const challenge = generateChallenge();
  const timestamp = new Date().toISOString();
  
  console.log(`✅ Mock: Generated challenge ${challenge} for ${contextIdentifier.type}:${contextIdentifier.identifier}`);
  
  res.status(201).json({
    challenge,
    timestamp
  });
});

router.post('/online/Session/InitSigned', (req: Request, res: Response) => {
  console.log('🔐 Mock: InitSigned called');
  console.log('📄 Received signed XML length:', req.body?.length || 'No body');
  
  // Simulate processing delay
  setTimeout(() => {
    const sessionToken = generateSessionToken();
    const referenceNumber = generateReferenceNumber();
    
    // Store mock session
    mockSessions.set(sessionToken, {
      createdAt: new Date(),
      referenceNumber,
      contextNip: '1111111111', // Mock NIP from our tests
      status: 'active'
    });
    
    console.log(`✅ Mock: Created session with token ${sessionToken.slice(0, 20)}...`);
    
    res.status(201).json(createSuccessResponse({
      sessionToken: {
        token: sessionToken,
        elementReferenceNumber: referenceNumber
      }
    }));
  }, 500); // Simulate network delay
});

router.post('/online/Session/InitToken', (req: Request, res: Response) => {
  console.log('🎟️ Mock: InitToken called');
  
  const sessionToken = generateSessionToken();
  const referenceNumber = generateReferenceNumber();
  
  mockSessions.set(sessionToken, {
    createdAt: new Date(),
    referenceNumber,
    contextNip: '1111111111',
    status: 'active'
  });
  
  console.log(`✅ Mock: Created token session ${sessionToken.slice(0, 20)}...`);
  
  res.status(201).json(createSuccessResponse({
    sessionToken: {
      token: sessionToken,
      elementReferenceNumber: referenceNumber
    }
  }));
});

router.get('/online/Session/Status', (req: Request, res: Response) => {
  const sessionToken = req.headers['sessiontoken'] as string;
  
  if (!sessionToken || !mockSessions.has(sessionToken)) {
    return res.status(401).json(createErrorResponse(21003, 'Nieautoryzowany dostęp'));
  }
  
  const session = mockSessions.get(sessionToken);
  
  res.json(createSuccessResponse({
    processingCode: 200,
    processingDescription: 'Sesja aktywna',
    sessionStatus: {
      activeElements: 0,
      processingElementsCount: 0,
      timestampStart: session.createdAt.toISOString()
    }
  }));
});

router.get('/online/Session/Terminate', (req: Request, res: Response) => {
  const sessionToken = req.headers['sessiontoken'] as string;
  
  if (sessionToken && mockSessions.has(sessionToken)) {
    mockSessions.delete(sessionToken);
    console.log(`🔚 Mock: Terminated session ${sessionToken.slice(0, 20)}...`);
  }
  
  res.json(createSuccessResponse({
    processingCode: 200,
    processingDescription: 'Sesja zakończona'
  }));
});

// Invoice endpoints
router.put('/online/Invoice/Send', (req: Request, res: Response) => {
  console.log('📨 Mock: Invoice/Send called');
  const sessionToken = req.headers['sessiontoken'] as string;
  
  if (!sessionToken || !mockSessions.has(sessionToken)) {
    return res.status(401).json(createErrorResponse(21003, 'Nieautoryzowany dostęp'));
  }
  
  const session = mockSessions.get(sessionToken);
  const elementReferenceNumber = generateReferenceNumber();
  const ksefReferenceNumber = generateKSeFNumber(session.contextNip);
  
  // Store mock invoice
  mockInvoices.set(elementReferenceNumber, {
    ksefReferenceNumber,
    sessionToken,
    status: 'processing',
    createdAt: new Date(),
    invoiceNumber: `INV_${session.contextNip}_${Date.now()}`
  });
  
  console.log(`✅ Mock: Invoice sent with reference ${elementReferenceNumber}`);
  
  res.status(202).json(createSuccessResponse({
    elementReferenceNumber,
    processingCode: 100,
    processingDescription: 'Faktura została przyjęta do przetwarzania'
  }));
});

router.get('/online/Invoice/Status/:referenceNumber', (req: Request, res: Response) => {
  const { referenceNumber } = req.params;
  const sessionToken = req.headers['sessiontoken'] as string;
  
  if (!sessionToken || !mockSessions.has(sessionToken)) {
    return res.status(401).json(createErrorResponse(21003, 'Nieautoryzowany dostęp'));
  }
  
  const invoice = mockInvoices.get(referenceNumber);
  
  if (!invoice) {
    return res.status(404).json(createErrorResponse(21002, 'Nie znaleziono faktury'));
  }
  
  // Simulate processing progression
  const now = new Date();
  const createdAt = new Date(invoice.createdAt);
  const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  
  let status = 'processing';
  let processingCode = 100;
  let processingDescription = 'Faktura w trakcie przetwarzania';
  
  if (ageMinutes > 2) {
    status = 'accepted';
    processingCode = 200;
    processingDescription = 'Faktura została zaakceptowana';
    invoice.status = 'accepted';
  }
  
  console.log(`📊 Mock: Invoice status check for ${referenceNumber}: ${status}`);
  
  res.json(createSuccessResponse({
    elementReferenceNumber: referenceNumber,
    processingCode,
    processingDescription,
    invoiceStatus: status === 'accepted' ? {
      invoiceNumber: invoice.invoiceNumber,
      ksefReferenceNumber: invoice.ksefReferenceNumber,
      acquisitionTimestamp: invoice.createdAt.toISOString()
    } : undefined
  }));
});

router.get('/online/Invoice/Get/:ksefReferenceNumber', (req: Request, res: Response) => {
  const { ksefReferenceNumber } = req.params;
  const sessionToken = req.headers['sessiontoken'] as string;
  
  if (!sessionToken || !mockSessions.has(sessionToken)) {
    return res.status(401).json(createErrorResponse(21003, 'Nieautoryzowany dostęp'));
  }
  
  // Find invoice by KSeF reference number
  const invoice = Array.from(mockInvoices.values()).find(inv => inv.ksefReferenceNumber === ksefReferenceNumber);
  
  if (!invoice) {
    return res.status(404).json(createErrorResponse(21002, 'Nie znaleziono faktury'));
  }
  
  // Return mock invoice XML
  const mockInvoiceXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <InvoiceHeader>
    <InvoiceNumber>${invoice.invoiceNumber}</InvoiceNumber>
    <IssueDate>${invoice.createdAt.toISOString().split('T')[0]}</IssueDate>
    <KSeFReferenceNumber>${invoice.ksefReferenceNumber}</KSeFReferenceNumber>
  </InvoiceHeader>
  <Seller>
    <Name>Test Company</Name>
    <TaxID>1111111111</TaxID>
  </Seller>
  <Buyer>
    <Name>Test Buyer</Name>
    <TaxID>2222222222</TaxID>
  </Buyer>
  <InvoiceLines>
    <InvoiceLine>
      <Description>Mock Service Item</Description>
      <Quantity>1</Quantity>
      <UnitPrice>100.00</UnitPrice>
      <LineTotal>100.00</LineTotal>
    </InvoiceLine>
  </InvoiceLines>
  <Summary>
    <TotalAmount>123.00</TotalAmount>
    <TaxAmount>23.00</TaxAmount>
  </Summary>
</Invoice>`;
  
  console.log(`📥 Mock: Retrieved invoice ${ksefReferenceNumber}`);
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(mockInvoiceXml, 'utf-8'));
});

// Query endpoints
router.post('/online/Query/Invoice/Sync', (req: Request, res: Response) => {
  console.log('🔍 Mock: Query/Invoice/Sync called');
  const sessionToken = req.headers['sessiontoken'] as string;
  const { PageSize = 10, PageOffset = 0 } = req.query;
  
  if (!sessionToken || !mockSessions.has(sessionToken)) {
    return res.status(401).json(createErrorResponse(21003, 'Nieautoryzowany dostęp'));
  }
  
  const session = mockSessions.get(sessionToken);
  
  // Generate mock invoice list
  const mockInvoiceList = Array.from({ length: Math.min(Number(PageSize), 5) }, (_, i) => ({
    invoiceNumber: `INV_${session.contextNip}_${Date.now() + i}`,
    ksefReferenceNumber: generateKSeFNumber(session.contextNip),
    acquisitionTimestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    invoiceType: 'VAT',
    subjectType: 'subject1'
  }));
  
  console.log(`✅ Mock: Returning ${mockInvoiceList.length} mock invoices`);
  
  res.json(createSuccessResponse({
    invoiceHeaderList: mockInvoiceList,
    numberOfElements: mockInvoiceList.length,
    pageSize: Number(PageSize),
    pageOffset: Number(PageOffset),
    hasMoreElements: false
  }));
});

// Credentials endpoints (basic mock)
router.post('/online/Credentials/GenerateToken', (req: Request, res: Response) => {
  console.log('🎫 Mock: Credentials/GenerateToken called');
  const sessionToken = req.headers['sessiontoken'] as string;
  
  if (!sessionToken || !mockSessions.has(sessionToken)) {
    return res.status(401).json(createErrorResponse(21003, 'Nieautoryzowany dostęp'));
  }
  
  const authToken = crypto.randomBytes(16).toString('hex');
  
  res.json(createSuccessResponse({
    authorisationToken: authToken,
    elementReferenceNumber: generateReferenceNumber()
  }));
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'KSeF Mock Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    activeSessions: mockSessions.size,
    storedInvoices: mockInvoices.size
  });
});

// Middleware to log all requests
router.use('*', (req: Request, res: Response, next) => {
  console.log(`🌐 Mock KSeF: ${req.method} ${req.originalUrl}`);
  console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📄 Body:`, typeof req.body === 'string' ? req.body.slice(0, 200) + '...' : JSON.stringify(req.body, null, 2));
  }
  next();
});

export { router as ksefMockRoutes };
