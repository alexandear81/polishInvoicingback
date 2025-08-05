/**
 * Test script for deployed KSeF Mock Service
 * Tests the live backend deployment
 */

// Replace with your actual deployed backend URL
const DEPLOYED_BACKEND_URL = 'https://polishinvoicingback-1.onrender.com';

async function testDeployedMockService() {
  console.log('🚀 Testing Deployed KSeF Mock Service');
  console.log('=' * 50);
  console.log(`🌐 Backend URL: ${DEPLOYED_BACKEND_URL}`);
  
  try {
    // 1. Test backend health
    console.log('\n1️⃣ Testing Backend Health...');
    const healthResponse = await fetch(`${DEPLOYED_BACKEND_URL}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log(`✅ Backend Status: ${healthData.status}`);
    console.log(`⏰ Uptime: ${Math.round(healthData.uptime)}s`);
    console.log(`🌍 Environment: ${healthData.env}`);
    
    // 2. Check KSeF configuration
    console.log('\n2️⃣ Checking KSeF Configuration...');
    const configResponse = await fetch(`${DEPLOYED_BACKEND_URL}/api/ksef/config`);
    
    if (!configResponse.ok) {
      throw new Error(`Config check failed: ${configResponse.status}`);
    }
    
    const config = await configResponse.json();
    console.log(`🎭 Mode: ${config.mode}`);
    console.log(`📡 Base URL: ${config.baseUrl}`);
    console.log(`💬 Message: ${config.message}`);
    console.log(`✨ Features: ${config.features?.join(', ') || 'None listed'}`);
    
    if (config.mode !== 'mock') {
      console.log('⚠️  Warning: Mock mode not enabled on deployment');
      console.log('💡 You may need to set USE_MOCK_KSEF=true in environment variables');
    }
    
    // 3. Test mock service health (if mock mode is enabled)
    if (config.mode === 'mock') {
      console.log('\n3️⃣ Testing Mock Service Health...');
      try {
        const mockHealthResponse = await fetch(`${DEPLOYED_BACKEND_URL}/api/ksef-mock/health`);
        
        if (mockHealthResponse.ok) {
          const mockHealth = await mockHealthResponse.json();
          console.log(`✅ Mock Service: ${mockHealth.status}`);
          console.log(`📊 Active Sessions: ${mockHealth.activeSessions}`);
          console.log(`📦 Stored Invoices: ${mockHealth.storedInvoices}`);
        } else {
          console.log('❌ Mock service health endpoint not accessible');
        }
      } catch (error) {
        console.log('❌ Mock service not responding:', error.message);
      }
    }
    
    // 4. Test authorization challenge endpoint
    console.log('\n4️⃣ Testing Authorization Challenge...');
    const challengeResponse = await fetch(`${DEPLOYED_BACKEND_URL}/api/ksef-mock/online/Session/AuthorisationChallenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contextIdentifier: {
          type: 'onip',
          identifier: '1111111111'
        }
      })
    });
    
    if (challengeResponse.ok) {
      const challengeData = await challengeResponse.json();
      console.log(`✅ Challenge Generated: ${challengeData.challenge}`);
      console.log(`⏰ Timestamp: ${challengeData.timestamp}`);
      
      // 5. Test session initialization
      console.log('\n5️⃣ Testing Session Initialization...');
      const sessionResponse = await fetch(`${DEPLOYED_BACKEND_URL}/api/ksef-mock/online/Session/InitSigned`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: `<mock-signed-xml challenge="${challengeData.challenge}">Test deployment</mock-signed-xml>`
      });
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const sessionToken = sessionData.sessionToken?.token || sessionData.sessionToken;
        
        console.log(`✅ Session Created: ${sessionToken?.slice(0, 20)}...`);
        console.log(`📋 Reference: ${sessionData.referenceNumber}`);
        
        // 6. Test invoice sending
        console.log('\n6️⃣ Testing Invoice Send...');
        const invoiceResponse = await fetch(`${DEPLOYED_BACKEND_URL}/api/ksef-mock/online/Invoice/Send`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'SessionToken': sessionToken
          },
          body: JSON.stringify({
            invoiceHash: {
              hashSHA: {
                algorithm: 'SHA-256',
                encoding: 'Base64',
                value: 'deployment-test-hash'
              },
              fileSize: 1024
            },
            invoicePayload: {
              type: 'plain',
              invoiceBody: 'VGVzdCBkZXBsb3ltZW50IGludm9pY2U=' // base64: "Test deployment invoice"
            }
          })
        });
        
        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          console.log(`✅ Invoice Sent: ${invoiceData.elementReferenceNumber}`);
          console.log(`📊 Status: ${invoiceData.processingDescription}`);
        } else {
          console.log(`❌ Invoice send failed: ${invoiceResponse.status}`);
          const errorText = await invoiceResponse.text();
          console.log(`Error: ${errorText}`);
        }
        
      } else {
        console.log(`❌ Session init failed: ${sessionResponse.status}`);
        const errorText = await sessionResponse.text();  
        console.log(`Error: ${errorText}`);
      }
      
    } else {
      console.log(`❌ Challenge failed: ${challengeResponse.status}`);
      const errorText = await challengeResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
    console.log('\n🎉 Deployment Test Complete!');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('=' * 20);
    
    if (config.mode === 'mock') {
      console.log('✅ Mock KSeF service is running on deployment');
      console.log('🚀 Ready for frontend integration');
      console.log('💡 You can now use the deployed backend for development');
    } else {
      console.log('⚠️  Mock mode not enabled on deployment');
      console.log('💡 Add USE_MOCK_KSEF=true to environment variables');
      console.log('🔧 Or contact deployment admin to enable mock mode');
    }
    
  } catch (error) {
    console.error('❌ Deployment test failed:', error.message);
    console.error('\n🔍 Troubleshooting steps:');
    console.error('1. Check if backend is deployed and accessible');
    console.error('2. Verify USE_MOCK_KSEF=true in environment variables');
    console.error('3. Check deployment logs for errors');
    console.error('4. Ensure all dependencies are installed');
  }
}

// Test different backend URLs
async function testMultipleUrls() {
  const urlsToTest = [
    'https://polishinvoicingback-1.onrender.com',
    'https://polish-invoicing-backend.herokuapp.com', // if you have Heroku
    'http://localhost:3001' // local fallback
  ];
  
  console.log('🔍 Testing Multiple Backend URLs...');
  
  for (const url of urlsToTest) {
    console.log(`\n🌐 Testing: ${url}`);
    try {
      const response = await fetch(`${url}/health`, { timeout: 5000 });
      if (response.ok) {
        console.log(`✅ ${url} is accessible`);
        
        // Test config endpoint
        const configResponse = await fetch(`${url}/api/ksef/config`);
        if (configResponse.ok) {
          const config = await configResponse.json();
          console.log(`   🎭 Mode: ${config.mode}`);
          console.log(`   💬 ${config.message}`);
        }
      } else {
        console.log(`❌ ${url} returned ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${url} is not accessible: ${error.message}`);
    }
  }
}

// Export functions for reuse
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    testDeployedMockService, 
    testMultipleUrls 
  };
}

// Run if called directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('test-deployed')) {
  testDeployedMockService();
}
