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
  // Use mock if explicitly enabled OR if in development and not explicitly disabled
  const useMock = process.env.USE_MOCK_KSEF === 'true' || 
                  (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_KSEF !== 'false');
  
  const environment = (process.env.KSEF_ENVIRONMENT as 'test' | 'demo' | 'prod') || 'test';
  
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
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
