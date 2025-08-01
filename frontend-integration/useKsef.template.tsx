/**
 * React Hook for KSeF Integration - TEMPLATE FILE
 * 
 * 📋 INSTRUCTIONS FOR USE:
 * ========================
 * 1. Copy this file to your React project
 * 2. Rename it from .template.tsx to .tsx
 * 3. Copy ksefService.ts to the same directory
 * 4. Ensure React 16.8+ is installed
 * 5. Uncomment the imports below
 * 6. Use the hook in your components
 * 
 * This template provides complete KSeF integration with:
 * - State management (loading, errors, data)
 * - Authentication flow
 * - Invoice operations
 * - Pagination support
 */

// =============================================================================
// STEP 1: UNCOMMENT THESE IMPORTS IN YOUR REACT PROJECT
// =============================================================================

// import { useState, useEffect, useCallback } from 'react';
// import ksefService, { 
//   KsefService, 
//   AuthorizationChallengeResponse,
//   AuthenticationResponse,
//   SendInvoiceResponse,
//   QueryInvoicesResponse,
//   Invoice,
//   GetInvoiceResponse,
//   InvoiceStatusResponse
// } from './ksefService';

// =============================================================================
// STEP 2: COPY THESE INTERFACES TO YOUR PROJECT
// =============================================================================

export interface UseKsefState {
  // Authentication state
  isAuthenticated: boolean;
  sessionToken: string | null;
  environment: 'test' | 'demo' | 'prod';
  
  // Loading states
  loading: boolean;
  authLoading: boolean;
  invoiceLoading: boolean;
  queryLoading: boolean;
  
  // Error states
  error: string | null;
  authError: string | null;
  invoiceError: string | null;
  queryError: string | null;
  
  // Data states
  invoices: any[]; // Change to Invoice[] after importing types
  totalInvoices: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface UseKsefActions {
  // Authentication actions
  requestChallenge: (nip: string, userType?: 'onip' | 'operson') => Promise<any | null>;
  completeAuth: (signedXmlBase64: string) => Promise<any | null>;
  initWithToken: (nip: string, authToken: string) => Promise<any | null>;
  logout: () => Promise<void>;
  
  // Invoice actions
  sendInvoice: (xmlContent: string, contentType?: 'xml' | 'gzip' | 'zip') => Promise<any | null>;
  queryInvoices: (dateFrom: string, dateTo: string, page?: number) => Promise<any | null>;
  getInvoice: (ksefId: string) => Promise<any | null>;
  getInvoiceStatus: (referenceNumber: string) => Promise<any | null>;
  
  // Utility actions
  setEnvironment: (env: 'test' | 'demo' | 'prod') => void;
  clearErrors: () => void;
  checkHealth: () => Promise<boolean>;
}

export interface UseKsefOptions {
  environment?: 'test' | 'demo' | 'prod';
  pageSize?: number;
  autoCheckAuth?: boolean;
}

export interface UseKsefReturn extends UseKsefState, UseKsefActions {}

// =============================================================================
// STEP 3: COPY THIS HOOK IMPLEMENTATION
// =============================================================================

/*
COPY THE FOLLOWING FUNCTION TO YOUR REACT PROJECT:

export const useKsef = (options: UseKsefOptions = {}): UseKsefReturn => {
  const {
    environment = 'test',
    pageSize = 20,
    autoCheckAuth = true
  } = options;

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================

  const [state, setState] = useState<UseKsefState>({
    // Authentication state
    isAuthenticated: false,
    sessionToken: null,
    environment,
    
    // Loading states
    loading: false,
    authLoading: false,
    invoiceLoading: false,
    queryLoading: false,
    
    // Error states
    error: null,
    authError: null,
    invoiceError: null,
    queryError: null,
    
    // Data states
    invoices: [],
    totalInvoices: 0,
    currentPage: 0,
    pageSize,
    hasNextPage: false
  });

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const updateState = useCallback((updates: Partial<UseKsefState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearErrors = useCallback(() => {
    updateState({
      error: null,
      authError: null,
      invoiceError: null,
      queryError: null
    });
  }, [updateState]);

  const handleError = useCallback((error: any, type: 'auth' | 'invoice' | 'query' | 'general' = 'general') => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error(`KSeF ${type} error:`, error);
    
    const errorField = type === 'auth' ? 'authError' : 
                      type === 'invoice' ? 'invoiceError' :
                      type === 'query' ? 'queryError' : 'error';
    
    updateState({ [errorField]: message });
  }, [updateState]);

  // =============================================================================
  // AUTHENTICATION ACTIONS
  // =============================================================================

  const requestChallenge = useCallback(async (
    nip: string, 
    userType: 'onip' | 'operson' = 'onip'
  ): Promise<AuthorizationChallengeResponse | null> => {
    updateState({ authLoading: true, authError: null });
    
    try {
      const response = await ksefService.requestAuthorizationChallenge(nip, userType);
      updateState({ authLoading: false });
      return response;
    } catch (error) {
      handleError(error, 'auth');
      updateState({ authLoading: false });
      return null;
    }
  }, [updateState, handleError]);

  const completeAuth = useCallback(async (
    signedXmlBase64: string
  ): Promise<AuthenticationResponse | null> => {
    updateState({ authLoading: true, authError: null });
    
    try {
      const response = await ksefService.completeAuthentication(signedXmlBase64);
      updateState({ 
        authLoading: false,
        isAuthenticated: true,
        sessionToken: response.sessionToken
      });
      return response;
    } catch (error) {
      handleError(error, 'auth');
      updateState({ authLoading: false });
      return null;
    }
  }, [updateState, handleError]);

  const initWithToken = useCallback(async (
    nip: string, 
    authToken: string
  ): Promise<AuthenticationResponse | null> => {
    updateState({ authLoading: true, authError: null });
    
    try {
      const response = await ksefService.initializeSessionWithToken(nip, authToken);
      updateState({ 
        authLoading: false,
        isAuthenticated: true,
        sessionToken: response.sessionToken
      });
      return response;
    } catch (error) {
      handleError(error, 'auth');
      updateState({ authLoading: false });
      return null;
    }
  }, [updateState, handleError]);

  const logout = useCallback(async (): Promise<void> => {
    updateState({ authLoading: true });
    
    try {
      await ksefService.terminateSession();
    } catch (error) {
      console.warn('Error terminating session:', error);
    }
    
    updateState({
      authLoading: false,
      isAuthenticated: false,
      sessionToken: null,
      invoices: [],
      totalInvoices: 0,
      currentPage: 0
    });
  }, [updateState]);

  // =============================================================================
  // INVOICE ACTIONS
  // =============================================================================

  const sendInvoice = useCallback(async (
    xmlContent: string, 
    contentType: 'xml' | 'gzip' | 'zip' = 'xml'
  ): Promise<SendInvoiceResponse | null> => {
    updateState({ invoiceLoading: true, invoiceError: null });
    
    try {
      const base64Xml = KsefService.xmlToBase64(xmlContent);
      const response = await ksefService.sendInvoice(base64Xml, contentType);
      updateState({ invoiceLoading: false });
      return response;
    } catch (error) {
      handleError(error, 'invoice');
      updateState({ invoiceLoading: false });
      return null;
    }
  }, [updateState, handleError]);

  const queryInvoices = useCallback(async (
    dateFrom: string, 
    dateTo: string, 
    page: number = 0
  ): Promise<QueryInvoicesResponse | null> => {
    updateState({ queryLoading: true, queryError: null });
    
    try {
      const response = await ksefService.queryInvoices(dateFrom, dateTo, {
        pageSize: state.pageSize,
        pageOffset: page * state.pageSize
      });
      
      updateState({ 
        queryLoading: false,
        invoices: response.invoices,
        totalInvoices: response.totalCount,
        currentPage: page,
        hasNextPage: response.pageInfo.hasNext
      });
      
      return response;
    } catch (error) {
      handleError(error, 'query');
      updateState({ queryLoading: false });
      return null;
    }
  }, [updateState, handleError, state.pageSize]);

  const getInvoice = useCallback(async (
    ksefId: string
  ): Promise<GetInvoiceResponse | null> => {
    updateState({ loading: true, error: null });
    
    try {
      const response = await ksefService.getInvoice(ksefId);
      updateState({ loading: false });
      return response;
    } catch (error) {
      handleError(error);
      updateState({ loading: false });
      return null;
    }
  }, [updateState, handleError]);

  const getInvoiceStatus = useCallback(async (
    referenceNumber: string
  ): Promise<InvoiceStatusResponse | null> => {
    updateState({ loading: true, error: null });
    
    try {
      const response = await ksefService.getInvoiceStatus(referenceNumber);
      updateState({ loading: false });
      return response;
    } catch (error) {
      handleError(error);
      updateState({ loading: false });
      return null;
    }
  }, [updateState, handleError]);

  // =============================================================================
  // UTILITY ACTIONS
  // =============================================================================

  const setEnvironment = useCallback((env: 'test' | 'demo' | 'prod') => {
    ksefService.setEnvironment(env);
    updateState({ environment: env });
  }, [updateState]);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      await ksefService.checkHealth();
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }, [handleError]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Initialize service environment
  useEffect(() => {
    ksefService.setEnvironment(environment);
    updateState({ environment });
  }, [environment, updateState]);

  // Check authentication status on mount
  useEffect(() => {
    if (autoCheckAuth) {
      const isAuth = ksefService.isAuthenticated();
      updateState({ isAuthenticated: isAuth });
    }
  }, [autoCheckAuth, updateState]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // State
    ...state,
    
    // Authentication actions
    requestChallenge,
    completeAuth,
    initWithToken,
    logout,
    
    // Invoice actions
    sendInvoice,
    queryInvoices,
    getInvoice,
    getInvoiceStatus,
    
    // Utility actions
    setEnvironment,
    clearErrors,
    checkHealth
  };
};

export default useKsef;
*/

// =============================================================================
// STEP 4: USAGE EXAMPLES
// =============================================================================

/*
// BASIC USAGE IN REACT COMPONENT
import React, { useState } from 'react';
import { useKsef } from './useKsef';

function InvoiceManager() {
  const {
    isAuthenticated,
    authLoading,
    invoiceLoading,
    invoices,
    authError,
    invoiceError,
    requestChallenge,
    completeAuth,
    sendInvoice,
    queryInvoices,
    clearErrors
  } = useKsef({ environment: 'test' });

  const [nip, setNip] = useState('');
  const [xmlToSign, setXmlToSign] = useState('');

  const handleRequestChallenge = async () => {
    const challenge = await requestChallenge(nip);
    if (challenge) {
      setXmlToSign(challenge.xmlToSign);
    }
  };

  const handleCompleteAuth = async () => {
    // In real app, user would sign the XML here
    const signedXml = 'base64-signed-xml';
    await completeAuth(signedXml);
  };

  const handleSendInvoice = async () => {
    const xmlContent = '<?xml version="1.0"...'; // Your invoice XML
    await sendInvoice(xmlContent);
  };

  const handleLoadInvoices = async () => {
    await queryInvoices(
      '2025-01-01T00:00:00+00:00',
      '2025-12-31T23:59:59+00:00'
    );
  };

  if (!isAuthenticated) {
    return (
      <div>
        <h2>KSeF Authentication</h2>
        <input 
          value={nip} 
          onChange={(e) => setNip(e.target.value)}
          placeholder="Enter NIP"
        />
        <button onClick={handleRequestChallenge} disabled={authLoading}>
          {authLoading ? 'Loading...' : 'Request Challenge'}
        </button>
        
        {xmlToSign && (
          <div>
            <p>Sign this XML: {xmlToSign.substring(0, 100)}...</p>
            <button onClick={handleCompleteAuth} disabled={authLoading}>
              Complete Authentication
            </button>
          </div>
        )}
        
        {authError && <p style={{color: 'red'}}>Error: {authError}</p>}
      </div>
    );
  }

  return (
    <div>
      <h2>KSeF Invoice Manager</h2>
      
      <button onClick={handleSendInvoice} disabled={invoiceLoading}>
        {invoiceLoading ? 'Sending...' : 'Send Invoice'}
      </button>
      
      <button onClick={handleLoadInvoices} disabled={queryLoading}>
        {queryLoading ? 'Loading...' : 'Load Invoices'}
      </button>
      
      {invoiceError && <p style={{color: 'red'}}>Invoice Error: {invoiceError}</p>}
      
      <div>
        <h3>Invoices ({invoices.length})</h3>
        {invoices.map((invoice, index) => (
          <div key={invoice.ksefId || index}>
            {invoice.ksefId} - {invoice.acquisitionTimestamp}
          </div>
        ))}
      </div>
    </div>
  );
}

// PAGINATION EXAMPLE
function InvoiceList() {
  const {
    invoices,
    currentPage,
    hasNextPage,
    queryLoading,
    queryInvoices
  } = useKsef();

  const loadPage = async (page: number) => {
    await queryInvoices(
      '2025-01-01T00:00:00+00:00',
      '2025-12-31T23:59:59+00:00',
      page
    );
  };

  return (
    <div>
      {invoices.map((invoice, index) => (
        <div key={invoice.ksefId || index}>{invoice.ksefId}</div>
      ))}
      
      <div>
        <button 
          onClick={() => loadPage(currentPage - 1)}
          disabled={currentPage === 0 || queryLoading}
        >
          Previous
        </button>
        
        <span>Page {currentPage + 1}</span>
        
        <button 
          onClick={() => loadPage(currentPage + 1)}
          disabled={!hasNextPage || queryLoading}
        >
          Next
        </button>
      </div>
    </div>
  );
}
*/

// =============================================================================
// INSTALLATION REQUIREMENTS
// =============================================================================

/*
For your React project, ensure you have:

1. React 16.8+ (for hooks support)
   npm install react@^16.8.0

2. TypeScript (if using TypeScript)
   npm install typescript @types/react @types/react-dom

3. Copy both files to your project:
   - ksefService.ts (or ksefService.js for JavaScript projects)
   - This template file (rename to useKsef.tsx)

4. Update the backend URL in ksefService if needed
*/
