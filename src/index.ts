import dotenv from 'dotenv';
import app from './server.js';

// Load environment variables first
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

console.log('Starting server...');
console.log(`Port: ${PORT}, Host: ${HOST}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Backend server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`KSeF API URL: ${process.env.KSEF_API_URL || 'https://ksef-test.mf.gov.pl'}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;
