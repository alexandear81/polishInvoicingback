import app from './server.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`KSeF API URL: ${process.env.KSEF_API_URL || 'https://ksef-test.mf.gov.pl'}`);
});

export default app;
