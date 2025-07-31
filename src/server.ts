import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ksefRoutes } from './routes/ksef.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/ksef', ksefRoutes);

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

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
