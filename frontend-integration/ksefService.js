/**
 * KSeF API Service - Frontend Integration
 * 
 * Complete service for interacting with the KSeF backend API
 * Handles authentication, invoice operations, and error management
 * 
 * Usage:
 * - Import this service in your React/Vue components
 * - Use the methods to interact with KSeF API
 * - Handle responses and errors appropriately
 */

// Configuration
const API_CONFIG = {
  // Backend URLs (choose one based on your deployment)
  BACKEND_URL: 'https://polishinvoicingback-1.onrender.com', // Production
  // BACKEND_URL: 'http://localhost:3001', // Local development
  
  // Default environment for KSeF API
  DEFAULT_ENVIRONMENT: 'test', // 'test', 'demo', or 'prod'
  
  // Request timeout (30 seconds)
  TIMEOUT: 30000
};

/**
 * Base fetch wrapper with error handling and timeout
 */
async function apiRequest(endpoint, options = {}) {
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

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    
    console.error('API Request failed:', error);
    throw error;
  }
}

/**
 * KSeF API Service Class
 */
class KsefService {
  constructor() {
    this.sessionToken = null;
    this.environment = API_CONFIG.DEFAULT_ENVIRONMENT;
  }

  /**
   * Set the session token for authenticated requests
   */
  setSessionToken(token) {
    this.sessionToken = token;
    console.log('🔑 Session token updated');
  }

  /**
   * Set the KSeF environment (test, demo, prod)
   */
  setEnvironment(env) {
    this.environment = env;
    console.log(`🌍 Environment set to: ${env}`);
  }

  /**
   * Get headers for authenticated requests
   */
  getAuthHeaders() {
    const headers = {};
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
  async requestAuthorizationChallenge(nip, userType = 'onip') {
    try {
      const response = await apiRequest('/api/ksef/authorization-challenge', {
        method: 'POST',
        body: JSON.stringify({
          contextIdentifier: {
            type: userType, // 'onip' for companies, 'operson' for individuals
            identifier: nip
          },
          environment: this.environment
        })
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
  async completeAuthentication(signedXmlBase64) {
    try {
      const response = await apiRequest('/api/ksef/request-session-token', {
        method: 'POST',
        body: JSON.stringify({
          signedXmlBase64: signedXmlBase64,
          environment: this.environment
        })
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
  async initializeSessionWithToken(nip, authToken) {
    try {
      const response = await apiRequest('/api/ksef/init-session-token', {
        method: 'POST',
        body: JSON.stringify({
          nip: nip,
          authToken: authToken,
          environment: this.environment
        })
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
  async sendInvoice(invoiceXmlBase64, contentType = 'xml') {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest('/api/ksef/send-invoice', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          sessionToken: this.sessionToken,
          invoiceXmlBase64: invoiceXmlBase64,
          contentType: contentType, // 'xml', 'gzip', or 'zip'
          environment: this.environment
        })
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
  async queryInvoices(dateFrom, dateTo, options = {}) {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest('/api/ksef/query-invoices', {
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
        })
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
  async getInvoice(ksefId) {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest(`/api/ksef/invoice/${ksefId}?environment=${this.environment}`, {
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
  async getInvoiceStatus(referenceNumber) {
    if (!this.sessionToken) {
      throw new Error('No session token available. Please authenticate first.');
    }

    try {
      const response = await apiRequest(`/api/ksef/invoice-status/${referenceNumber}?environment=${this.environment}`, {
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
  async terminateSession() {
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
  async checkHealth() {
    try {
      const response = await apiRequest('/health');
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
  static xmlToBase64(xmlString) {
    return btoa(unescape(encodeURIComponent(xmlString)));
  }

  /**
   * Decode base64 to XML string
   */
  static base64ToXml(base64String) {
    return decodeURIComponent(escape(atob(base64String)));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.sessionToken;
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    return {
      hasToken: !!this.sessionToken,
      environment: this.environment,
      backendUrl: API_CONFIG.BACKEND_URL
    };
  }
}

// =============================================================================
// EXPORT AND USAGE EXAMPLES
// =============================================================================

// Create singleton instance
const ksefService = new KsefService();

// Export the service
export default ksefService;

// Named exports for specific use cases
export { KsefService, API_CONFIG };

/*
=============================================================================
USAGE EXAMPLES
=============================================================================

// 1. BASIC SETUP
import ksefService from './ksefService.js';

// Set environment (optional, defaults to 'test')
ksefService.setEnvironment('test'); // or 'demo' or 'prod'

// 2. AUTHENTICATION FLOW
try {
  // Step 1: Get challenge XML
  const challenge = await ksefService.requestAuthorizationChallenge('1234567890');
  console.log('XML to sign:', challenge.xmlToSign);
  
  // User signs the XML with their certificate...
  // const signedXml = '...'; // Signed XML from user
  
  // Step 2: Complete authentication
  const auth = await ksefService.completeAuthentication(signedXml);
  console.log('Session token:', auth.sessionToken);
  
} catch (error) {
  console.error('Authentication failed:', error.message);
}

// 3. SEND INVOICE
try {
  const xmlContent = '<?xml version="1.0"...'; // Your invoice XML
  const base64Xml = ksefService.xmlToBase64(xmlContent);
  
  const result = await ksefService.sendInvoice(base64Xml, 'xml');
  console.log('Invoice sent:', result);
  
} catch (error) {
  console.error('Failed to send invoice:', error.message);
}

// 4. QUERY INVOICES
try {
  const invoices = await ksefService.queryInvoices(
    '2025-01-01T00:00:00+00:00',
    '2025-01-31T23:59:59+00:00',
    { pageSize: 10 }
  );
  console.log('Found invoices:', invoices);
  
} catch (error) {
  console.error('Failed to query invoices:', error.message);
}

// 5. REACT COMPONENT EXAMPLE
import React, { useState, useEffect } from 'react';
import ksefService from './ksefService.js';

function KsefDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsAuthenticated(ksefService.isAuthenticated());
  }, []);

  const handleSendInvoice = async (xmlContent) => {
    setLoading(true);
    try {
      const base64Xml = ksefService.xmlToBase64(xmlContent);
      const result = await ksefService.sendInvoice(base64Xml);
      alert('Invoice sent successfully!');
    } catch (error) {
      alert(`Failed to send invoice: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const result = await ksefService.queryInvoices(
        '2025-01-01T00:00:00+00:00',
        '2025-12-31T23:59:59+00:00'
      );
      setInvoices(result.invoices || []);
    } catch (error) {
      alert(`Failed to load invoices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div>Please authenticate first</div>;
  }

  return (
    <div>
      <button onClick={loadInvoices} disabled={loading}>
        Load Invoices
      </button>
      {loading && <p>Loading...</p>}
      <ul>
        {invoices.map(invoice => (
          <li key={invoice.id}>{invoice.name}</li>
        ))}
      </ul>
    </div>
  );
}

=============================================================================
*/
