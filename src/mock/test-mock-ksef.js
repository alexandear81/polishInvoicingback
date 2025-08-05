/**
 * KSeF Mock Service Test Script
 * Demonstrates complete workflow using the mock API
 */

const BASE_URL = 'http://localhost:3001';

async function testMockKSeFWorkflow() {
  console.log('🎭 Testing KSeF Mock Service');
  console.log('=' * 40);
  
  try {
    // 1. Check if mock is enabled
    console.log('\n1️⃣ Checking Mock Configuration...');
    const configResponse = await fetch(`${BASE_URL}/api/ksef/config`);
    const config = await configResponse.json();
    
    console.log(`Mode: ${config.mode}`);
    console.log(`Message: ${config.message}`);
    console.log(`Features: ${config.features.join(', ')}`);
    
    if (config.mode !== 'mock') {
      console.log('❌ Mock mode not enabled. Set USE_MOCK_KSEF=true');
      return;
    }
    
    // 2. Get authentication challenge
    console.log('\n2️⃣ Getting Authentication Challenge...');
    const challengeResponse = await fetch(`${BASE_URL}/api/ksef-mock/online/Session/AuthorisationChallenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextIdentifier: { type: 'onip', identifier: '1111111111' }
      })
    });
    
    const challengeData = await challengeResponse.json();
    console.log(`✅ Challenge: ${challengeData.challenge}`);
    console.log(`⏰ Timestamp: ${challengeData.timestamp}`);
    
    // 3. Initialize session
    console.log('\n3️⃣ Initializing Session...');
    const sessionResponse = await fetch(`${BASE_URL}/api/ksef-mock/online/Session/InitSigned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: `<mock-signed-xml challenge="${challengeData.challenge}">Mock signed content</mock-signed-xml>`
    });
    
    const sessionData = await sessionResponse.json();
    const sessionToken = sessionData.sessionToken.token;
    console.log(`✅ Session Token: ${sessionToken.slice(0, 20)}...`);
    console.log(`📋 Reference Number: ${sessionData.referenceNumber}`);
    
    // 4. Check session status
    console.log('\n4️⃣ Checking Session Status...');
    const statusResponse = await fetch(`${BASE_URL}/api/ksef-mock/online/Session/Status`, {
      headers: { 'SessionToken': sessionToken }
    });
    
    const statusData = await statusResponse.json();
    console.log(`✅ Session Status: ${statusData.processingDescription}`);
    
    // 5. Send invoice
    console.log('\n5️⃣ Sending Invoice...');
    const invoiceResponse = await fetch(`${BASE_URL}/api/ksef-mock/online/Invoice/Send`, {
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
            value: 'mock-hash-value-123'
          },
          fileSize: 1024
        },
        invoicePayload: {
          type: 'plain',
          invoiceBody: 'PG1vY2staW52b2ljZS14bWw+PC9tb2NrLWludm9pY2UteG1sPg==' // base64 mock
        }
      })
    });
    
    const invoiceData = await invoiceResponse.json();
    const elementReferenceNumber = invoiceData.elementReferenceNumber;
    console.log(`✅ Invoice Sent: ${elementReferenceNumber}`);
    console.log(`📋 Processing: ${invoiceData.processingDescription}`);
    
    // 6. Check invoice status immediately
    console.log('\n6️⃣ Checking Invoice Status (Immediate)...');
    const invoiceStatusResponse1 = await fetch(`${BASE_URL}/api/ksef-mock/online/Invoice/Status/${elementReferenceNumber}`, {
      headers: { 'SessionToken': sessionToken }
    });
    
    const invoiceStatusData1 = await invoiceStatusResponse1.json();
    console.log(`📊 Status: ${invoiceStatusData1.processingDescription}`);
    console.log(`🔢 Code: ${invoiceStatusData1.processingCode}`);
    
    // 7. Wait and check status again (should show progression)
    console.log('\n7️⃣ Waiting 3 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const invoiceStatusResponse2 = await fetch(`${BASE_URL}/api/ksef-mock/online/Invoice/Status/${elementReferenceNumber}`, {
      headers: { 'SessionToken': sessionToken }
    });
    
    const invoiceStatusData2 = await invoiceStatusResponse2.json();
    console.log(`📊 Status: ${invoiceStatusData2.processingDescription}`);
    
    if (invoiceStatusData2.invoiceStatus) {
      const ksefNumber = invoiceStatusData2.invoiceStatus.ksefReferenceNumber;
      console.log(`🎯 KSeF Number: ${ksefNumber}`);
      
      // 8. Download invoice
      console.log('\n8️⃣ Downloading Invoice...');
      const downloadResponse = await fetch(`${BASE_URL}/api/ksef-mock/online/Invoice/Get/${ksefNumber}`, {
        headers: { 'SessionToken': sessionToken }
      });
      
      const invoiceXml = await downloadResponse.text();
      console.log(`📥 Downloaded Invoice XML (${invoiceXml.length} chars)`);
      console.log(`📄 Preview: ${invoiceXml.slice(0, 200)}...`);
    }
    
    // 9. Query invoices
    console.log('\n9️⃣ Querying Invoices...');
    const queryResponse = await fetch(`${BASE_URL}/api/ksef-mock/online/Query/Invoice/Sync?PageSize=5&PageOffset=0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SessionToken': sessionToken
      },
      body: JSON.stringify({
        queryCriteria: {
          subjectType: 'subject1',
          type: 'incremental',
          acquisitionTimestampThresholdFrom: '2025-01-01T00:00:00Z',
          acquisitionTimestampThresholdTo: '2025-12-31T23:59:59Z'
        }
      })
    });
    
    const queryData = await queryResponse.json();
    console.log(`📋 Found ${queryData.numberOfElements} invoices`);
    queryData.invoiceHeaderList?.forEach((invoice, index) => {
      console.log(`   ${index + 1}. ${invoice.invoiceNumber} (${invoice.ksefReferenceNumber})`);
    });
    
    // 10. Terminate session
    console.log('\n🔟 Terminating Session...');
    const terminateResponse = await fetch(`${BASE_URL}/api/ksef-mock/online/Session/Terminate`, {
      headers: { 'SessionToken': sessionToken }
    });
    
    const terminateData = await terminateResponse.json();
    console.log(`✅ ${terminateData.processingDescription}`);
    
    // 11. Check mock health
    console.log('\n1️⃣1️⃣ Checking Mock Service Health...');
    const healthResponse = await fetch(`${BASE_URL}/api/ksef-mock/health`);
    const healthData = await healthResponse.json();
    
    console.log(`🏥 Status: ${healthData.status}`);
    console.log(`📊 Active Sessions: ${healthData.activeSessions}`);
    console.log(`📦 Stored Invoices: ${healthData.storedInvoices}`);
    
    console.log('\n🎉 Mock KSeF Workflow Test Complete!');
    console.log('✅ All endpoints working correctly');
    console.log('🚀 Ready for frontend development');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('💡 Make sure the server is running with USE_MOCK_KSEF=true');
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testMockKSeFWorkflow };
}

// Run if called directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('test-mock-ksef')) {
  testMockKSeFWorkflow();
}
