// Quick verification script - run after enabling USE_MOCK_KSEF=true
const BACKEND_URL = 'https://polishinvoicingback-1.onrender.com';

async function quickVerify() {
  console.log('🔍 Quick Mock Mode Verification\n');
  
  try {
    // Check configuration
    const configResponse = await fetch(`${BACKEND_URL}/api/ksef/config`);
    const config = await configResponse.json();
    
    console.log(`🎭 Mode: ${config.mode}`);
    console.log(`📡 Base URL: ${config.baseUrl}`);
    console.log(`💬 ${config.message}\n`);
    
    if (config.mode === 'mock') {
      console.log('✅ SUCCESS: Mock mode is enabled!');
      
      // Quick health check
      const healthResponse = await fetch(`${BACKEND_URL}/api/ksef-mock/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log(`✅ Mock service status: ${health.status}`);
        console.log('🚀 Ready for frontend integration!');
      } else {
        console.log('⚠️  Mock service endpoints not responding');
      }
    } else {
      console.log('❌ Still in real mode');
      console.log('💡 Make sure USE_MOCK_KSEF=true is set and backend is redeployed');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

quickVerify();
