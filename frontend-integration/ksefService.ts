/**
 * KSeF API Service - TypeScript Version
 * 
 * Complete service for interacting with the KSeF backend API
 * Handles authentication, invoice operations, and error management
 * 
 * Usage:
 * - Import this service in your React/Vue TypeScript components
 * - Use the methods to interact with KSeF API
 * - Handle responses and errors appropriately
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface ApiConfig {
  BACKEND_URL: string;
  DEFAULT_ENVIRONMENT: 'test' | 'demo' | 'prod';
  TIMEOUT: number;
}

export interface ContextIdentifier {
  type: 'onip' | 'operson';
  identifier: string;
}

export interface AuthorizationChallengeRequest {
  contextIdentifier: ContextIdentifier;
  environment?: string;
}

export interface AuthorizationChallengeResponse {
  challenge: string;
  timestamp: string;
  xmlToSign: string;
  message: string;
}

export interface AuthenticationRequest {
  signedXmlBase64: string;
  environment?: string;
}

export interface AuthenticationResponse {
  sessionToken: string;
  timestamp: string;
  referenceNumber: string;
  message: string;
}

export interface TokenSessionRequest {
  nip: string;
  authToken: string;
  environment?: string;
}

export interface SendInvoiceRequest {
  sessionToken: string;
  invoiceXmlBase64: string;
  contentType: 'xml' | 'gzip' | 'zip';
  environment?: string;
}

export interface SendInvoiceResponse {
  ksefId?: string;
  referenceNumber: string;
  timestamp: string;
  message: string;
}

export interface QueryInvoicesRequest {
  dateFrom: string;
  dateTo: string;
  environment?: string;
  subjectType?: string;
  type?: string;
  pageSize?: number;
  pageOffset?: number;
}

export interface QueryInvoicesResponse {
  invoices: Invoice[];
  totalCount: number;
  pageInfo: {
    pageSize: number;
    pageOffset: number;
    hasNext: boolean;
  };
}

export interface Invoice {
  ksefId: string;
  acquisitionTimestamp: string;
  subjectType: string;
  type: string;
}

export interface GetInvoiceResponse {
  ksefId: string;
  invoiceBase64: string;
  contentType: string;
  message: string;
}

export interface InvoiceStatusResponse {
  referenceNumber: string;
  status: string;
  processingCode?: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  env: string;
}

export interface SessionInfo {
  hasToken: boolean;
  environment: string;
  backendUrl: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_CONFIG: ApiConfig = {
  // Backend URLs (choose one based on your deployment)
  BACKEND_URL: 'https://polishinvoicingback-1.onrender.com', // Production
  // BACKEND_URL: 'http://localhost:3001', // Local development
  
  // Default environment for KSeF API
  DEFAULT_ENVIRONMENT: 'test', // 'test', 'demo', or 'prod'
  
  // Request timeout (30 seconds)
  TIMEOUT: 30000
};

// =============================================================================
// API REQUEST WRAPPER
// =============================================================================

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const url = `${API_CONFIG.BACKEND_URL}${endpoint}`;
    console.log(`🌐 Making request to: ${url}`);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
    }

    return await response.json() as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    
    console.error('API Request failed:', error);
    throw error;
  }
}

// =============================================================================
// KSEF SERVICE CLASS
// =============================================================================

export class KsefService {
  private sessionToken: string | null = null;
  private environment: 'test' | 'demo' | 'prod' = API_CONFIG.DEFAULT_ENVIRONMENT;

  /**
   * Set the session token for authenticated requests
   */
  setSessionToken(token: string): void {
    this.sessionToken = token;
    console.log('🔑 Session token updated');
  }

  /**
   * Set the KSeF environment (test, demo, prod)
   */
  setEnvironment(env: 'test' | 'demo' | 'prod'): void {
    this.environment = env;
    console.log(`🌍 Environment set to: ${env}`);
  }

  /**
   * Get headers for authenticated requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.sessionToken) {
      headers['session-token'] = this.sessionToken;
    }
    return headers;
  }

  // =============================================================================
  // AUTHENTICATION FLOW
  // =============================================================================

  /**
   * Step 1: Request authorization challenge
   * Returns XML that needs to be signed with ePUAP/qualified certificate
   */
  async requestAuthorizationChallenge(
    nip: string, 
    userType: 'onip' | 'operson' = 'onip'
  ): Promise<AuthorizationChallengeResponse> {
    try {
      const response = await apiRequest<AuthorizationChallengeResponse>('/api/ksef/authorization-challenge', {
        method: 'POST',
        body: JSON.stringify({
          contextIdentifier: {
            type: userType, // 'onip' for companies, 'operson' for individuals
            identifier: nip
          },
          environment: this.environment
        } as AuthorizationChallengeRequest)
      });

      console.log('✅ Authorization challenge received');
      return response;
    } catch (error) {
      console.error('❌ Failed to get authorization challenge:', error);
      throw error;
    }
  }

  /**
   * Step 2: Complete authentication with signed XML
   * Returns session token for authenticated operations
   */
  async completeAuthentication(signedXmlBase64: string): Promise<AuthenticationResponse> {
    try {
      const response = await apiRequest<AuthenticationResponse>('/api/ksef/request-session-token', {
        method: 'POST',
        body: JSON.stringify({
          signedXmlBase64: signedXmlBase64,
          environment: this.environment
        } as AuthenticationRequest)
      });

      // Automatically store the session token
      if (response.sessionToken) {
        this.setSessionToken(response.sessionToken);
        console.log('✅ Authentication completed successfully');
      }

      return response;
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Alternative: Initialize session with token (if you already have one)
   * For users who have their own auth tokens
   */
  async initializeSessionWithToken(nip: string, authToken: string): Promise<AuthenticationResponse> {
    try {
      const response = await apiRequest<AuthenticationResponse>('/api/ksef/init-session-token', {
        method: 'POST',
        body: JSON.stringify({
          nip: nip,
          authToken: authToken,
          environment: this.environment
        } as TokenSessionRequest)
      });

      // Automatically store the session token
      if (response.sessionToken) {
        this.setSessionToken(response.sessionToken);
        console.log('✅ Session initialized with token');
      }

      return response;
    } catch (error) {
      console.error('❌ Token session initialization failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // INVOICE OPERATIONS
  // =============================================================================

  /**
   * Send invoice to KSeF
   * Supports XML, gzipped XML, or ZIP files
   */
  async sendInvoice(
    invoiceXmlBase64: string, 
    contentType: 'xml' | 'gzip' | 'zip' = 'xml'
  ): Promise<SendInvoiceResponse> {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest<SendInvoiceResponse>('/api/ksef/send-invoice', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          sessionToken: this.sessionToken,
          invoiceXmlBase64: invoiceXmlBase64,
          contentType: contentType, // 'xml', 'gzip', or 'zip'
          environment: this.environment
        } as SendInvoiceRequest)
      });

      console.log('✅ Invoice sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to send invoice:', error);
      throw error;
    }
  }

  /**
   * Query invoices (view incoming/outgoing)
   */
  async queryInvoices(
    dateFrom: string, 
    dateTo: string, 
    options: Partial<QueryInvoicesRequest> = {}
  ): Promise<QueryInvoicesResponse> {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest<QueryInvoicesResponse>('/api/ksef/query-invoices', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          dateFrom: dateFrom,
          dateTo: dateTo,
          environment: this.environment,
          subjectType: options.subjectType || 'subject1',
          type: options.type || 'incremental',
          pageSize: options.pageSize || 20,
          pageOffset: options.pageOffset || 0,
          ...options
        } as QueryInvoicesRequest)
      });

      console.log('✅ Invoice query completed');
      return response;
    } catch (error) {
      console.error('❌ Failed to query invoices:', error);
      throw error;
    }
  }

  /**
   * Get specific invoice by KSeF ID
   */
  async getInvoice(ksefId: string): Promise<GetInvoiceResponse> {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest<GetInvoiceResponse>(`/api/ksef/invoice/${ksefId}?environment=${this.environment}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      console.log('✅ Invoice retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to get invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice processing status
   */
  async getInvoiceStatus(referenceNumber: string): Promise<InvoiceStatusResponse> {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest<InvoiceStatusResponse>(`/api/ksef/invoice-status/${referenceNumber}?environment=${this.environment}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      console.log('✅ Invoice status retrieved');
      return response;
    } catch (error) {
      console.error('❌ Failed to get invoice status:', error);
      throw error;
    }
  }

  /**
   * Terminate active session
   */
  async terminateSession(): Promise<any> {
    if (!this.sessionToken) {
      throw new Error('No session token available.');
    }

    try {
      const response = await apiRequest('/api/ksef/terminate-session', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          environment: this.environment
        })
      });

      // Clear the stored session token
      this.sessionToken = null;
      console.log('✅ Session terminated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to terminate session:', error);
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Check backend health
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await apiRequest<HealthResponse>('/health');
      console.log('✅ Backend is healthy');
      return response;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      throw error;
    }
  }

  /**
   * Encode XML string to base64
   */
  static xmlToBase64(xmlString: string): string {
    return btoa(unescape(encodeURIComponent(xmlString)));
  }

  /**
   * Decode base64 to XML string
   */
  static base64ToXml(base64String: string): string {
    return decodeURIComponent(escape(atob(base64String)));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  /**
   * Get current session info
   */
  getSessionInfo(): SessionInfo {
    return {
      hasToken: !!this.sessionToken,
      environment: this.environment,
      backendUrl: API_CONFIG.BACKEND_URL
    };
  }
}

// =============================================================================
// EXPORT AND USAGE
// =============================================================================

// Create singleton instance
const ksefService = new KsefService();

// Export the service
export default ksefService;

// Named exports
export { API_CONFIG };

/*
=============================================================================
TYPESCRIPT USAGE EXAMPLES
=============================================================================

// 1. BASIC IMPORT AND SETUP
import ksefService, { KsefService } from './ksefService';

// Set environment (optional, defaults to 'test')
ksefService.setEnvironment('test'); // TypeScript ensures only valid values

// 2. AUTHENTICATION FLOW WITH TYPES
try {
  const challenge: AuthorizationChallengeResponse = await ksefService.requestAuthorizationChallenge('1234567890');
  console.log('XML to sign:', challenge.xmlToSign);
  
  // User signs the XML...
  const signedXml: string = '...'; // Signed XML from user
  
  const auth: AuthenticationResponse = await ksefService.completeAuthentication(signedXml);
  console.log('Session token:', auth.sessionToken);
  
} catch (error) {
  console.error('Authentication failed:', error);
}

// 3. REACT TYPESCRIPT COMPONENT
import React, { useState, useEffect } from 'react';
import ksefService, { Invoice, QueryInvoicesResponse } from './ksefService';

interface KsefDashboardProps {
  nip: string;
}

const KsefDashboard: React.FC<KsefDashboardProps> = ({ nip }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthenticated(ksefService.isAuthenticated());
  }, []);

  const handleSendInvoice = async (xmlContent: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const base64Xml = KsefService.xmlToBase64(xmlContent);
      const result = await ksefService.sendInvoice(base64Xml, 'xml');
      alert(`Invoice sent successfully! Reference: ${result.referenceNumber}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const result: QueryInvoicesResponse = await ksefService.queryInvoices(
        '2025-01-01T00:00:00+00:00',
        '2025-12-31T23:59:59+00:00',
        { pageSize: 20 }
      );
      setInvoices(result.invoices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div>Please authenticate first</div>;
  }

  return (
    <div>
      <h2>KSeF Dashboard</h2>
      
      <button onClick={loadInvoices} disabled={loading}>
        {loading ? 'Loading...' : 'Load Invoices'}
      </button>
      
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      
      <ul>
        {invoices.map((invoice: Invoice) => (
          <li key={invoice.ksefId}>
            {invoice.ksefId} - {invoice.acquisitionTimestamp}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default KsefDashboard;

=============================================================================
*/
