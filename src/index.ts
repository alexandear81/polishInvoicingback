import dotenv from 'dotenv';
import app from './server.js';

// Load environment variables first
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 Starting server...');
console.log(`📍 Port: ${PORT}, Host: ${HOST}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 KSeF API URL: ${process.env.KSEF_API_URL || 'https://ksef-test.mf.gov.pl'}`);

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Backend server running on ${HOST}:${PORT}`);
  console.log(`🎯 Health check available at: http://${HOST}:${PORT}/health`);
  console.log(`📊 Ready to accept connections`);
  
  // Keep alive heartbeat
  setInterval(() => {
    console.log(`💓 Server heartbeat - uptime: ${Math.floor(process.uptime())}s`);
  }, 30000); // Every 30 seconds
});

server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Keep the process alive
server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 120000; // 2 minutes

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('👋 Process terminated gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('👋 Process terminated gracefully');
    process.exit(0);
  });
});

export default app;
