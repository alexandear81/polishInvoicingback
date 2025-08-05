/**
 * KSeF Mock Service Configuration
 * Controls whether to use the real KSeF API or the mock service
 */

export interface KSeFConfig {
  useMock: boolean;
  mockBaseUrl: string;
  realBaseUrl: string;
  environment: 'test' | 'demo' | 'prod';
}

// Environment URLs for real KSeF API
const KSEF_ENVIRONMENTS = {
  test: 'https://ksef-test.mf.gov.pl/api',
  demo: 'https://ksef-demo.mf.gov.pl/api',
  prod: 'https://ksef.mf.gov.pl/api'
};

export const getKSeFConfig = (): KSeFConfig => {
  // Default to MOCK mode unless explicitly disabled
  // This makes mock the default behavior since real KSeF API has certificate issues
  const useMock = process.env.USE_MOCK_KSEF !== 'false' && 
                  process.env.USE_REAL_KSEF !== 'true';
  
  const environment = (process.env.KSEF_ENVIRONMENT as 'test' | 'demo' | 'prod') || 'test';
  
  // Use BACKEND_URL if available, otherwise detect based on environment
  let baseUrl = process.env.BACKEND_URL;
  if (!baseUrl) {
    if (process.env.NODE_ENV === 'production') {
      baseUrl = 'https://polishinvoicingback-1.onrender.com';
    } else {
      baseUrl = 'http://localhost:3001';
    }
  }
  
  console.log('🔧 KSeF Configuration:');
  console.log(`   📍 Base URL: ${baseUrl}`);
  console.log(`   🎭 Use Mock: ${useMock}`);
  console.log(`   🌍 Environment: ${environment}`);
  console.log(`   📊 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   🎯 USE_MOCK_KSEF: ${process.env.USE_MOCK_KSEF}`);
  
  return {
    useMock,
    mockBaseUrl: `${baseUrl}/api/ksef-mock`,
    realBaseUrl: KSEF_ENVIRONMENTS[environment],
    environment
  };
};

export const getKSeFUrl = (endpoint?: string): string => {
  const config = getKSeFConfig();
  const baseUrl = config.useMock ? config.mockBaseUrl : config.realBaseUrl;
  
  if (config.useMock) {
    console.log(`🎭 Using Mock KSeF API: ${baseUrl}${endpoint || ''}`);
  } else {
    console.log(`🌐 Using Real KSeF API: ${baseUrl}${endpoint || ''}`);
  }
  
  return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

/**
 * Mock-specific utilities
 */
export const isMockMode = (): boolean => {
  return getKSeFConfig().useMock;
};

export const getMockHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'PolishInvoicing-Mock/1.0'
  };
};

export const getRealKSeFHeaders = () => {
  return {
    'Content-Type': 'application/octet-stream',
    'Accept': 'application/json',
    'User-Agent': 'PolishInvoicing/1.0'
  };
};
