/**
 * GUS REGON API Routes
 * Provides endpoints for fetching Polish company data
 */

import express, { Request, Response } from 'express';
import { gusRegonService, GUSResponse, CompanyData, validateNIP, validateREGON } from '../services/gus-regon.js';

const router = express.Router();

// Configuration endpoint
router.get('/config', (req: Request, res: Response) => {
  const useTest = process.env.GUS_USE_TEST !== 'false';
  const hasApiKey = !!(process.env.GUS_API_KEY || process.env.GUS_USER_KEY);
  
  res.json({
    environment: useTest ? 'test' : 'production',
    testMode: useTest,
    apiKeyConfigured: hasApiKey,
    apiKeySource: process.env.GUS_API_KEY ? 'GUS_API_KEY' : 
                  process.env.GUS_USER_KEY ? 'GUS_USER_KEY' : 'default_test_key',
    message: useTest 
      ? '🧪 Using GUS test environment - Default test key available' 
      : hasApiKey 
        ? '🏢 Using GUS production environment - API key configured'
        : '⚠️ Production mode but no API key configured - will use test key',
    features: [
      'Company data by NIP',
      'Company data by REGON',
      'Detailed company information',
      'Address information',
      'PKD codes and activities',
      'Legal form and status',
      'Registration dates'
    ],
    endpoints: {
      searchByNIP: 'GET /api/gus/company/nip/:nip',
      searchByREGON: 'GET /api/gus/company/regon/:regon',
      getDetails: 'GET /api/gus/company/:regon/details',
      validate: 'POST /api/gus/validate',
      config: 'GET /api/gus/config'
    },
    setup: {
      environmentVariables: {
        'GUS_API_KEY': 'Your registered GUS API key (preferred)',
        'GUS_USER_KEY': 'Alternative name for GUS API key',
        'GUS_USE_TEST': 'Set to "false" to use production environment (default: true)'
      },
      registration: {
        url: 'https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx',
        note: 'Register for free production API key at GUS website'
      }
    }
  });
});

// Search company by NIP
router.get('/company/nip/:nip', async (req: Request, res: Response) => {
  try {
    const { nip } = req.params;
    const { details = false } = req.query;

    console.log(`🔍 Searching company by NIP: ${nip}`);

    // Validate NIP format first
    if (!validateNIP(nip)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid NIP format or checksum',
        details: 'NIP must be 10 digits with valid checksum'
      });
    }

    // Search for company
    const result: GUSResponse = await gusRegonService.searchByNIP(nip);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // If detailed information is requested and we have REGON, fetch details
    if (details === 'true' && result.data?.regon) {
      console.log(`📋 Fetching detailed information for REGON: ${result.data.regon}`);
      const detailResult = await gusRegonService.getCompanyDetails(result.data.regon);
      
      if (detailResult.success && detailResult.data) {
        result.data = { ...result.data, ...detailResult.data };
      }
    }

    res.json({
      searchType: 'NIP',
      searchValue: nip,
      ...result
    });

  } catch (error: any) {
    console.error('❌ NIP search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during NIP search',
      details: error.message
    });
  }
});

// Search company by REGON
router.get('/company/regon/:regon', async (req: Request, res: Response) => {
  try {
    const { regon } = req.params;
    const { details = false } = req.query;

    console.log(`🔍 Searching company by REGON: ${regon}`);

    // Validate REGON format first
    if (!validateREGON(regon)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid REGON format or checksum',
        details: 'REGON must be 9 or 14 digits with valid checksum'
      });
    }

    // Search for company
    const result: GUSResponse = await gusRegonService.searchByREGON(regon);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // If detailed information is requested, fetch details
    if (details === 'true' && result.data?.regon) {
      console.log(`📋 Fetching detailed information for REGON: ${result.data.regon}`);
      const detailResult = await gusRegonService.getCompanyDetails(result.data.regon);
      
      if (detailResult.success && detailResult.data) {
        result.data = { ...result.data, ...detailResult.data };
      }
    }

    res.json({
      searchType: 'REGON',
      searchValue: regon,
      ...result
    });

  } catch (error: any) {
    console.error('❌ REGON search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during REGON search',
      details: error.message
    });
  }
});

// Get detailed company information
router.get('/company/:regon/details', async (req: Request, res: Response) => {
  try {
    const { regon } = req.params;

    console.log(`📋 Fetching detailed company data for REGON: ${regon}`);

    const result: GUSResponse = await gusRegonService.getCompanyDetails(regon);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      detailsFor: regon,
      ...result
    });

  } catch (error: any) {
    console.error('❌ Details fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during details fetch',
      details: error.message
    });
  }
});

// Validate NIP or REGON numbers
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { nip, regon } = req.body;

    if (!nip && !regon) {
      return res.status(400).json({
        success: false,
        error: 'Either NIP or REGON must be provided'
      });
    }

    const validation: any = {
      success: true,
      validation: {}
    };

    if (nip) {
      const isValidNIP = validateNIP(nip);
      validation.validation.nip = {
        value: nip,
        valid: isValidNIP,
        cleaned: nip.replace(/[-\s]/g, ''),
        message: isValidNIP ? 'Valid NIP' : 'Invalid NIP format or checksum'
      };
    }

    if (regon) {
      const isValidREGON = validateREGON(regon);
      validation.validation.regon = {
        value: regon,
        valid: isValidREGON,
        cleaned: regon.replace(/[-\s]/g, ''),
        message: isValidREGON ? 'Valid REGON' : 'Invalid REGON format or checksum'
      };
    }

    res.json(validation);

  } catch (error: any) {
    console.error('❌ Validation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during validation',
      details: error.message
    });
  }
});

// Universal search endpoint (detects NIP vs REGON automatically)
router.get('/search/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const { details = false } = req.query;

    const cleanId = identifier.replace(/[-\s]/g, '');
    
    console.log(`🔍 Universal search for: ${identifier} (cleaned: ${cleanId})`);

    let result: GUSResponse;
    let searchType: string;

    // Detect if it's NIP (10 digits) or REGON (9 or 14 digits)
    if (/^\d{10}$/.test(cleanId)) {
      searchType = 'NIP';
      if (!validateNIP(cleanId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid NIP checksum',
          searchType: 'NIP',
          searchValue: identifier
        });
      }
      result = await gusRegonService.searchByNIP(cleanId);
    } else if (/^\d{9}$|^\d{14}$/.test(cleanId)) {
      searchType = 'REGON';
      if (!validateREGON(cleanId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid REGON checksum',
          searchType: 'REGON',
          searchValue: identifier
        });
      }
      result = await gusRegonService.searchByREGON(cleanId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid identifier format. Must be NIP (10 digits) or REGON (9/14 digits)',
        searchValue: identifier
      });
    }

    if (!result.success) {
      return res.status(404).json({
        searchType,
        searchValue: identifier,
        ...result
      });
    }

    // Fetch details if requested
    if (details === 'true' && result.data?.regon) {
      console.log(`📋 Fetching detailed information for REGON: ${result.data.regon}`);
      const detailResult = await gusRegonService.getCompanyDetails(result.data.regon);
      
      if (detailResult.success && detailResult.data) {
        result.data = { ...result.data, ...detailResult.data };
      }
    }

    res.json({
      searchType,
      searchValue: identifier,
      ...result
    });

  } catch (error: any) {
    console.error('❌ Universal search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during search',
      details: error.message,
      searchValue: req.params.identifier
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'GUS REGON API',
    environment: process.env.GUS_USE_TEST !== 'false' ? 'test' : 'production',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export { router as gusRoutes };
