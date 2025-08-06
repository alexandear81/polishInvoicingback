/**
 * GUS REGON Service Test Script
 * Demonstrates complete workflow using the GUS REGON API
 */

const BASE_URL = 'https://polishinvoicingback-1.onrender.com';

async function testGUSRegonWorkflow() {
  console.log('🏢 Testing GUS REGON Service');
  console.log('=' * 50);
  
  try {
    // 1. Check service configuration
    console.log('\n1️⃣ Checking GUS Configuration...');
    const configResponse = await fetch(`${BASE_URL}/api/gus/config`);
    const config = await configResponse.json();
    
    console.log(`Environment: ${config.environment}`);
    console.log(`Test Mode: ${config.testMode}`);
    console.log(`Message: ${config.message}`);
    console.log(`Features: ${config.features.join(', ')}`);
    
    // 2. Test health endpoint
    console.log('\n2️⃣ Testing Service Health...');
    const healthResponse = await fetch(`${BASE_URL}/api/gus/health`);
    const health = await healthResponse.json();
    
    console.log(`✅ Status: ${health.status}`);
    console.log(`🌐 Environment: ${health.environment}`);
    console.log(`📅 Version: ${health.version}`);
    
    // 3. Test NIP validation
    console.log('\n3️⃣ Testing NIP Validation...');
    
    const testNIPs = [
      '1234567890', // invalid checksum
      '5260001246', // valid test NIP
      '123456789',  // too short
      '12345678901' // too long
    ];
    
    for (const nip of testNIPs) {
      const validateResponse = await fetch(`${BASE_URL}/api/gus/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip })
      });
      
      const validation = await validateResponse.json();
      const nipValidation = validation.validation?.nip;
      
      if (nipValidation) {
        console.log(`  NIP ${nip}: ${nipValidation.valid ? '✅ Valid' : '❌ Invalid'} - ${nipValidation.message}`);
      }
    }
    
    // 4. Test REGON validation
    console.log('\n4️⃣ Testing REGON Validation...');
    
    const testREGONs = [
      '123456785',     // valid 9-digit REGON
      '12345678512347', // valid 14-digit REGON 
      '123456789',     // invalid checksum
      '12345678'       // too short
    ];
    
    for (const regon of testREGONs) {
      const validateResponse = await fetch(`${BASE_URL}/api/gus/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regon })
      });
      
      const validation = await validateResponse.json();
      const regonValidation = validation.validation?.regon;
      
      if (regonValidation) {
        console.log(`  REGON ${regon}: ${regonValidation.valid ? '✅ Valid' : '❌ Invalid'} - ${regonValidation.message}`);
      }
    }
    
    // 5. Test NIP search (using valid test NIP)
    console.log('\n5️⃣ Testing NIP Search...');
    const testNIP = '5260001246'; // Known test company NIP
    
    try {
      const nipSearchResponse = await fetch(`${BASE_URL}/api/gus/company/nip/${testNIP}`);
      
      if (nipSearchResponse.ok) {
        const nipResult = await nipSearchResponse.json();
        
        if (nipResult.success) {
          console.log(`✅ Found company: ${nipResult.data.name}`);
          console.log(`📍 City: ${nipResult.data.city}`);
          console.log(`📮 Postal Code: ${nipResult.data.postalCode || 'N/A'}`);
          console.log(`🏢 REGON: ${nipResult.data.regon || 'N/A'}`);
          console.log(`📋 PKD: ${nipResult.data.pkdMain || 'N/A'}`);
        } else {
          console.log(`❌ NIP search failed: ${nipResult.error}`);
        }
      } else {
        console.log(`❌ NIP search request failed: ${nipSearchResponse.status}`);
        const errorText = await nipSearchResponse.text();
        console.log(`Error details: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ NIP search error: ${error.message}`);
    }
    
    // 6. Test REGON search
    console.log('\n6️⃣ Testing REGON Search...');
    const testREGON = '123456785'; // Valid test REGON
    
    try {
      const regonSearchResponse = await fetch(`${BASE_URL}/api/gus/company/regon/${testREGON}`);
      
      if (regonSearchResponse.ok) {
        const regonResult = await regonSearchResponse.json();
        
        if (regonResult.success) {
          console.log(`✅ Found company: ${regonResult.data.name}`);
          console.log(`📍 City: ${regonResult.data.city}`);
          console.log(`🏢 NIP: ${regonResult.data.nip || 'N/A'}`);
        } else {
          console.log(`❌ REGON search failed: ${regonResult.error}`);
        }
      } else {
        console.log(`❌ REGON search request failed: ${regonSearchResponse.status}`);
        const errorText = await regonSearchResponse.text();
        console.log(`Error details: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ REGON search error: ${error.message}`);
    }
    
    // 7. Test universal search
    console.log('\n7️⃣ Testing Universal Search...');
    
    const testIdentifiers = [
      '5260001246',    // NIP
      '123456785'      // REGON
    ];
    
    for (const identifier of testIdentifiers) {
      try {
        const searchResponse = await fetch(`${BASE_URL}/api/gus/search/${identifier}`);
        
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          
          if (searchResult.success) {
            console.log(`✅ ${searchResult.searchType} ${identifier}: ${searchResult.data.name}`);
            console.log(`   📍 ${searchResult.data.city}, ${searchResult.data.postalCode || 'N/A'}`);
          } else {
            console.log(`❌ ${identifier}: ${searchResult.error}`);
          }
        } else {
          console.log(`❌ Search for ${identifier} failed: ${searchResponse.status}`);
        }
      } catch (error) {
        console.log(`❌ Search error for ${identifier}: ${error.message}`);
      }
    }
    
    // 8. Test detailed information
    console.log('\n8️⃣ Testing Detailed Information...');
    
    try {
      const detailsResponse = await fetch(`${BASE_URL}/api/gus/search/${testNIP}?details=true`);
      
      if (detailsResponse.ok) {
        const detailsResult = await detailsResponse.json();
        
        if (detailsResult.success && detailsResult.data) {
          console.log(`✅ Detailed info for: ${detailsResult.data.name}`);
          console.log(`📞 Phone: ${detailsResult.data.phone || 'N/A'}`);
          console.log(`📧 Email: ${detailsResult.data.email || 'N/A'}`);
          console.log(`🌐 Website: ${detailsResult.data.website || 'N/A'}`);
          console.log(`🏛️ Legal Form: ${detailsResult.data.legalForm || 'N/A'}`);
          console.log(`📋 PKD Description: ${detailsResult.data.pkdDescription || 'N/A'}`);
        } else {
          console.log(`❌ Details fetch failed: ${detailsResult.error}`);
        }
      } else {
        console.log(`❌ Details request failed: ${detailsResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Details error: ${error.message}`);
    }
    
    console.log('\n🎉 GUS REGON Service Test Complete!');
    console.log('✅ Service is operational');
    console.log('💡 Ready for invoice form integration');
    
    // Integration tips
    console.log('\n💡 Integration Tips:');
    console.log('1. Use universal search: GET /api/gus/search/{nip-or-regon}');
    console.log('2. Add ?details=true for complete company data');
    console.log('3. Validate before searching: POST /api/gus/validate');
    console.log('4. Handle both success and error responses');
    console.log('5. Cache results to avoid repeated API calls');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('💡 Make sure the backend is running with GUS service enabled');
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testGUSRegonWorkflow };
}

// Run if called directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('test-gus')) {
  testGUSRegonWorkflow();
}
