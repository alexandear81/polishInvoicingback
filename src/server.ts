import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ksefRoutes } from './routes/ksef.js';
import { ksefMockRoutes } from './mock/ksef-mock-server.js';
import { gusRoutes } from './routes/gus.js';
import { errorHandler } from './middleware/errorHandler.js';
import { keepAliveService } from './utils/keepAlive.js';

const app = express();

// Middleware
app.use(helmet());
app.use(compression());

// Enhanced CORS configuration
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:5173', 
  'http://localhost:4173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  // Production deployments
  'https://polish-invoicingfront.vercel.app',
  'https://polishinvoicing.firebaseapp.com',
  // Environment variable override
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'session-token', 'X-Requested-With']
}));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'No Origin'}`);
  console.log(`📋 Headers: ${JSON.stringify(req.headers, null, 2)}`);
  
  // Special logging for request-session-token
  if (req.path.includes('request-session-token')) {
    console.log('🔍 SPECIAL DEBUG: request-session-token endpoint hit!');
    console.log('📦 Body available:', !!req.body);
    console.log('📦 Body keys:', Object.keys(req.body || {}));
    console.log('📦 Content-Length:', req.headers['content-length']);
    
    if (req.body && req.body.signedXmlBase64) {
      console.log('📦 signedXmlBase64 length:', req.body.signedXmlBase64.length);
      console.log('📦 signedXmlBase64 preview:', req.body.signedXmlBase64.substring(0, 100));
    }
  }
  
  next();
});

// Body parsing middleware with error handling
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add error handling for body parsing
app.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof SyntaxError && 'body' in error) {
    console.error('❌ JSON Parse Error:', error.message);
    console.error('📍 Path:', req.path);
    console.error('📦 Raw body length:', req.headers['content-length']);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

// Routes
app.use('/api/ksef', ksefRoutes);
app.use('/api/gus', gusRoutes);

// Mock KSeF API (for development when real API is not available)
if (process.env.USE_MOCK_KSEF !== 'false') {
  console.log('🎭 Mock KSeF API enabled');
  app.use('/api/ksef-mock', ksefMockRoutes);
}

// Health check endpoints (Railway checks these)
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  console.log('🏠 Root endpoint requested');
  res.status(200).setHeader('Content-Type', 'application/json').json({ 
    message: 'KSeF Backend API', 
    status: 'running',
    healthy: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => {
  console.log('🏓 Ping requested');
  res.status(200).send('pong');
});

// Keep-alive status endpoint
app.get('/keep-alive/status', (req, res) => {
  console.log('⏰ Keep-alive status requested');
  const status = keepAliveService.getStatus();
  res.status(200).json({
    keepAlive: status,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
