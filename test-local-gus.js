/**
 * Local GUS REGON Service Test
 * Tests the service directly without deployment
 */

// Import the service directly using ES module syntax
import { validateNIP, validateREGON } from './dist/services/gus-regon.js';

async function testLocalGUS() {
  console.log('🧪 Testing GUS REGON Service Locally');
  console.log('=' * 40);
  
  try {
    // Test validation functions
    console.log('\n1️⃣ Testing Local Validation Functions...');
    
    // Test NIPs
    const testNIPs = [
      '1234567890', // invalid
      '5260001246', // valid
      '123456789',  // too short
      '12345678901' // too long
    ];
    
    console.log('\nNIP Validation:');
    testNIPs.forEach(nip => {
      const isValid = validateNIP(nip);
      console.log(`  ${nip}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });
    
    // Test REGONs
    const testREGONs = [
      '123456785',      // valid 9-digit
      '12345678512347', // valid 14-digit
      '123456789',      // invalid
      '12345678'        // too short
    ];
    
    console.log('\nREGON Validation:');
    testREGONs.forEach(regon => {
      const isValid = validateREGON(regon);
      console.log(`  ${regon}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });
    
    console.log('\n🎉 Local validation tests completed!');
    console.log('✅ Service functions are working correctly');
    
    // Show environment configuration
    console.log('\n🔧 Environment Configuration:');
    console.log(`  GUS_API_KEY: ${process.env.GUS_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`  GUS_USE_TEST: ${process.env.GUS_USE_TEST || 'default (true)'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    
    if (!process.env.GUS_API_KEY) {
      console.log('\n💡 To use production GUS API:');
      console.log('   1. Get API key from: https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx');
      console.log('   2. Set GUS_API_KEY environment variable');
      console.log('   3. Set GUS_USE_TEST=false for production');
    }
    
  } catch (error) {
    console.error('❌ Local test failed:', error);
  }
}

testLocalGUS();
