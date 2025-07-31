import app from './server.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Backend server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`KSeF API URL: ${process.env.KSEF_API_URL || 'https://ksef-test.mf.gov.pl'}`);
});

export default app;
