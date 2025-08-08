/**
 * GUS REGON API Service
 * Integrates with Polish Central Statistical Office (GUS) to fetch company data
 * 
 * Based on GUS-Regon-UslugaBIRver1.2-dokumentacjaVer1.36
 * Supports both production and test environments
 */

import axios, { AxiosResponse } from 'axios';
import xml2js from 'xml2js';

export interface GUSConfig {
  useTestEnvironment: boolean;
  userKey: string;
  baseUrl: string;
}

export interface CompanyData {
  nip?: string;
  regon?: string;
  name: string;
  shortName?: string;
  street?: string;
  houseNumber?: string;
  apartmentNumber?: string;
  city: string;
  postalCode: string;
  voivodeship?: string;
  county?: string;
  commune?: string;
  pkdMain?: string;
  pkdDescription?: string;
  legalForm?: string;
  registrationDate?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface GUSResponse {
  success: boolean;
  data?: CompanyData;
  error?: string;
  sessionId?: string;
  environment?: 'test' | 'production';
}

class GUSRegonService {
  private config: GUSConfig;
  private sessionId: string | null = null;
  private actions: Record<string, string> = {
    login: 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj',
    logout: 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Wyloguj',
    search: 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty',
    getFullReport: 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DanePobierzPelnyRaport'
  };

  private xmlTemplates = {
    login: (baseUrl: string, action: string, userKey: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:ns="http://CIS/BIR/PUBL/2014/07">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${baseUrl}</wsa:To>
<wsa:Action>${action}</wsa:Action>
</soap:Header>
<soap:Body>
<ns:Zaloguj>
<ns:pKluczUzytkownika>${userKey}</ns:pKluczUzytkownika>
</ns:Zaloguj>
</soap:Body>
</soap:Envelope>`,

    logout: (baseUrl: string, action: string, sessionId: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:ns="http://CIS/BIR/PUBL/2014/07">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${baseUrl}</wsa:To>
<wsa:Action>${action}</wsa:Action>
</soap:Header>
<soap:Body>
<ns:Wyloguj>
<ns:pIdentyfikatorSesji>${sessionId}</ns:pIdentyfikatorSesji>
</ns:Wyloguj>
</soap:Body>
</soap:Envelope>`,

    searchByNIP: (baseUrl: string, action: string, nip: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:ns="http://CIS/BIR/PUBL/2014/07" xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${baseUrl}</wsa:To>
<wsa:Action>${action}</wsa:Action>
</soap:Header>
<soap:Body>
<ns:DaneSzukajPodmioty>
<ns:pParametryWyszukiwania>
<dat:Nip>${nip}</dat:Nip>
</ns:pParametryWyszukiwania>
</ns:DaneSzukajPodmioty>
</soap:Body>
</soap:Envelope>`,

    searchByREGON: (baseUrl: string, action: string, regon: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:ns="http://CIS/BIR/PUBL/2014/07" xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${baseUrl}</wsa:To>
<wsa:Action>${action}</wsa:Action>
</soap:Header>
<soap:Body>
<ns:DaneSzukajPodmioty>
<ns:pParametryWyszukiwania>
<dat:Regon>${regon}</dat:Regon>
</ns:pParametryWyszukiwania>
</ns:DaneSzukajPodmioty>
</soap:Body>
</soap:Envelope>`,

    getFullReport: (baseUrl: string, action: string, regon: string, reportName: string = 'BIR11OsPrawna') => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
xmlns:ns="http://CIS/BIR/PUBL/2014/07">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>${baseUrl}</wsa:To>
<wsa:Action>${action}</wsa:Action>
</soap:Header>
<soap:Body>
<ns:DanePobierzPelnyRaport>
<ns:pRegon>${regon}</ns:pRegon>
<ns:pNazwaRaportu>${reportName}</ns:pNazwaRaportu>
</ns:DanePobierzPelnyRaport>
</soap:Body>
</soap:Envelope>`
  };

  constructor() {
    this.config = this.getConfig();
  }

  private getConfig(useTestEnvironment?: boolean): GUSConfig {
    // Use parameter if provided, otherwise default to test environment
    const useTest = useTestEnvironment !== undefined ? useTestEnvironment : true;
    
    // Get API key from environment variables
    const userKey = process.env.GUS_API_KEY || process.env.GUS_USER_KEY;
    
    if (!userKey && !useTest) {
      console.warn('⚠️ No GUS API key provided for production environment!');
      console.warn('💡 Set GUS_API_KEY in your environment for production use');
      console.warn('🔄 Falling back to test environment');
    }
    
    // Test environment credentials (publicly available for testing)
    const testConfig = {
      userKey: 'abcde12345abcde12345', // fallback test key
      baseUrl: 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc'
    };

    // Production environment (requires registered API key)
    const prodConfig = {
      userKey: userKey || testConfig.userKey, // fallback to test key if no prod key
      baseUrl: 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc'
    };

    const config = {
      useTestEnvironment: useTest,
      userKey: useTest ? testConfig.userKey : prodConfig.userKey,
      baseUrl: useTest ? testConfig.baseUrl : prodConfig.baseUrl
    };
    
    console.log('🔧 GUS REGON Configuration:');
    console.log(`   🌍 Environment: ${useTest ? 'TEST' : 'PRODUCTION'}`);
    console.log(`   🔑 API Key: ${config.userKey ? config.userKey.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`   📡 Base URL: ${config.baseUrl}`);
    
    return config;
  }

  /**
   * Login to GUS API and get session ID
   */
  async login(useTestEnvironment?: boolean): Promise<string> {
    // Reconfigure for this specific request if environment specified
    if (useTestEnvironment !== undefined) {
      this.config = this.getConfig(useTestEnvironment);
      this.sessionId = null; // Reset session when changing environment
    }

    const curAction = this.actions.login;
    const soapEnvelope = this.xmlTemplates.login(this.config.baseUrl, curAction, this.config.userKey);

    try {
      const response = await axios.post(this.config.baseUrl, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=UTF-8;',
          'SOAPAction': curAction
        }
      });

      const parser = new xml2js.Parser({ explicitArray: false });
      
      // Handle multipart response - extract XML from multipart content
      let xmlContent = response.data;
      if (typeof xmlContent === 'string' && xmlContent.includes('Content-Type: application/xop+xml')) {
        // Extract XML from multipart response
        const xmlStart = xmlContent.indexOf('<s:Envelope');
        const xmlEnd = xmlContent.lastIndexOf('</s:Envelope>') + '</s:Envelope>'.length;
        if (xmlStart !== -1 && xmlEnd !== -1) {
          xmlContent = xmlContent.substring(xmlStart, xmlEnd);
        }
      }
      
      const result = await parser.parseStringPromise(xmlContent);
      
      this.sessionId = result['s:Envelope']['s:Body']['ZalogujResponse']['ZalogujResult'];
      
      if (!this.sessionId || this.sessionId.length < 10) {
        throw new Error('Failed to get valid session ID from GUS');
      }

      console.log(`🔐 GUS Session established: ${this.sessionId.substring(0, 8)}... (${this.config.useTestEnvironment ? 'TEST' : 'PROD'})`);
      return this.sessionId;
    } catch (error: any) {
      console.error('❌ GUS Login failed:', error.message);
      throw new Error(`GUS API login failed: ${error.message}`);
    }
  }

  /**
   * Logout from GUS API
   */
  async logout(): Promise<boolean> {
    if (!this.sessionId) {
      return true;
    }

    const curAction = this.actions.logout;
    const soapEnvelope = this.xmlTemplates.logout(this.config.baseUrl, curAction, this.sessionId);

    try {
      await axios.post(this.config.baseUrl, soapEnvelope, {
        headers: {
          'Content-Type': `application/soap+xml; charset=UTF-8; action="${curAction}"`,
          'SOAPAction': curAction,
          'sid': this.sessionId
        }
      });

      console.log('🔓 GUS Session terminated');
      this.sessionId = null;
      return true;
    } catch (error) {
      console.warn('⚠️ GUS Logout warning:', error);
      this.sessionId = null;
      return false;
    }
  }

  /**
   * Search for company by NIP
   */
  async searchByNIP(nip: string, useTestEnvironment?: boolean): Promise<GUSResponse> {
    try {
      // Clean NIP (remove dashes and spaces)
      const cleanNip = nip.replace(/[-\s]/g, '');
      const curAction = this.actions.search;
      if (!/^\d{10}$/.test(cleanNip)) {
        return { success: false, error: 'Invalid NIP format. Expected 10 digits.' };
      }

      // Ensure we have a session
      if (!this.sessionId || useTestEnvironment !== undefined) {
        await this.login(useTestEnvironment);
      }

      const soapEnvelope = this.xmlTemplates.searchByNIP(this.config.baseUrl, curAction, cleanNip);

      const response = await axios.post(this.config.baseUrl, soapEnvelope, {
        headers: {
          'Content-Type': `application/soap+xml; charset=UTF-8; action="${curAction}"`,
          'SOAPAction': curAction,
          'sid': this.sessionId
        }
      });

      const result = await this.parseCompanyResponse(response, 'NIP', cleanNip);
      result.environment = this.config.useTestEnvironment ? 'test' : 'production';
      return result;
    } catch (error: any) {
      console.error('❌ GUS NIP search failed:', error.message);
      return { success: false, error: `Failed to search by NIP: ${error.message}` };
    }
  }

  /**
   * Search for company by REGON
   */
  async searchByREGON(regon: string, useTestEnvironment?: boolean): Promise<GUSResponse> {
    try {
      // Clean REGON (remove dashes and spaces)
      const cleanRegon = regon.replace(/[-\s]/g, '');
      const curAction = this.actions.search;
      
      if (!/^\d{9}$|^\d{14}$/.test(cleanRegon)) {
        return { success: false, error: 'Invalid REGON format. Expected 9 or 14 digits.' };
      }

      // Ensure we have a session
      if (!this.sessionId || useTestEnvironment !== undefined) {
        await this.login(useTestEnvironment);
      }

      const soapEnvelope = this.xmlTemplates.searchByREGON(this.config.baseUrl, curAction, cleanRegon);

      const response = await axios.post(this.config.baseUrl, soapEnvelope, {
        headers: {
          'Content-Type': `application/soap+xml; charset=UTF-8; action="${curAction}"`,
          'SOAPAction': curAction,
          'sid': this.sessionId
        }
      });

      const result = await this.parseCompanyResponse(response, 'REGON', cleanRegon);
      result.environment = this.config.useTestEnvironment ? 'test' : 'production';
      return result;
    } catch (error: any) {
      console.error('❌ GUS REGON search failed:', error.message);
      return { success: false, error: `Failed to search by REGON: ${error.message}` };
    }
  }

  /**
   * Get detailed company data by REGON
   */
  async getCompanyDetails(regon: string, useTestEnvironment?: boolean): Promise<GUSResponse> {
    try {
      const curAction = this.actions.getFullReport;
      
      if (!this.sessionId || useTestEnvironment !== undefined) {
        await this.login(useTestEnvironment);
      }

      const soapEnvelope = this.xmlTemplates.getFullReport(this.config.baseUrl, curAction, regon);

      const response = await axios.post(this.config.baseUrl, soapEnvelope, {
        headers: {
          'Content-Type': `application/soap+xml; charset=UTF-8; action="${curAction}"`,
          'SOAPAction': curAction,
          'sid': this.sessionId
        }
      });

      const result = await this.parseDetailedResponse(response);
      result.environment = this.config.useTestEnvironment ? 'test' : 'production';
      return result;
    } catch (error: any) {
      console.error('❌ GUS Details fetch failed:', error.message);
      return { success: false, error: `Failed to get company details: ${error.message}` };
    }
  }

  /**
   * Parse the initial company search response
   */
  private async parseCompanyResponse(response: AxiosResponse, searchType: string, searchValue: string): Promise<GUSResponse> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      
      // Handle multipart response - extract XML from multipart content
      let xmlContent = response.data;
      if (typeof xmlContent === 'string' && xmlContent.includes('Content-Type: application/xop+xml')) {
        // Extract XML from multipart response
        const xmlStart = xmlContent.indexOf('<s:Envelope');
        const xmlEnd = xmlContent.lastIndexOf('</s:Envelope>') + '</s:Envelope>'.length;
        if (xmlStart !== -1 && xmlEnd !== -1) {
          xmlContent = xmlContent.substring(xmlStart, xmlEnd);
        }
      }
      
      const result = await parser.parseStringPromise(xmlContent);
      
      const searchResult = result['s:Envelope']['s:Body']['DaneSzukajPodmiotyResponse']['DaneSzukajPodmiotyResult'];
      
      if (!searchResult || searchResult.trim() === '') {
        return { success: false, error: `No company found for ${searchType}: ${searchValue}` };
      }

      // Parse the XML data returned in the result
      const dataResult = await parser.parseStringPromise(searchResult);
      const companyData = dataResult.root?.dane;

      if (!companyData) {
        return { success: false, error: `No valid data found for ${searchType}: ${searchValue}` };
      }

      // Convert to our CompanyData format
      const company: CompanyData = {
        nip: companyData.Nip || undefined,
        regon: companyData.Regon || undefined,
        name: companyData.Nazwa || 'Unknown',
        shortName: companyData.NazwaSkrocona || undefined,
        street: companyData.Ulica || undefined,
        houseNumber: companyData.NrNieruchomosci || undefined,
        apartmentNumber: companyData.NrLokalu || undefined,
        city: companyData.Miejscowosc || 'Unknown',
        postalCode: companyData.KodPocztowy || undefined,
        voivodeship: companyData.Wojewodztwo || undefined,
        county: companyData.Powiat || undefined,
        commune: companyData.Gmina || undefined,
        pkdMain: companyData.PkdPodstawowy || undefined,
        legalForm: companyData.FormaFinansowania || undefined,
        registrationDate: companyData.DataZakonczeniaDzialalnosci || undefined,
        status: companyData.StatusNip || undefined
      };

      console.log(`✅ Found company: ${company.name} (${searchType}: ${searchValue})`);

      return {
        success: true,
        data: company,
        sessionId: this.sessionId || undefined
      };

    } catch (error: any) {
      console.error('❌ Failed to parse GUS response:', error.message);
      return { success: false, error: `Failed to parse response: ${error.message}` };
    }
  }

  /**
   * Parse detailed company data response
   */
  private async parseDetailedResponse(response: AxiosResponse): Promise<GUSResponse> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      
      // Handle multipart response - extract XML from multipart content
      let xmlContent = response.data;
      if (typeof xmlContent === 'string' && xmlContent.includes('Content-Type: application/xop+xml')) {
        // Extract XML from multipart response
        const xmlStart = xmlContent.indexOf('<s:Envelope');
        const xmlEnd = xmlContent.lastIndexOf('</s:Envelope>') + '</s:Envelope>'.length;
        if (xmlStart !== -1 && xmlEnd !== -1) {
          xmlContent = xmlContent.substring(xmlStart, xmlEnd);
        }
      }
      
      const result = await parser.parseStringPromise(xmlContent);
      
      const detailResult = result['s:Envelope']['s:Body']['DanePobierzPelnyRaportResponse']['DanePobierzPelnyRaportResult'];
      
      if (!detailResult || detailResult.trim() === '') {
        return { success: false, error: 'No detailed data available' };
      }

      const dataResult = await parser.parseStringPromise(detailResult);
      const detailData = dataResult.root?.dane;

      if (!detailData) {
        return { success: false, error: 'No valid detailed data found' };
      }

      // Enhanced company data with details
      const company: CompanyData = {
        nip: detailData.praw_nip || undefined,
        regon: detailData.praw_regon || undefined,
        name: detailData.praw_nazwa || detailData.praw_nazwaSkrocona || 'Unknown',
        shortName: detailData.praw_nazwaSkrocona || undefined,
        street: detailData.praw_adSiedzUlica_Nazwa || undefined,
        houseNumber: detailData.praw_adSiedzNumerNieruchomosci || undefined,
        apartmentNumber: detailData.praw_adSiedzNumerLokalu || undefined,
        city: detailData.praw_adSiedzMiejscowosc_Nazwa || 'Unknown',
        postalCode: detailData.praw_adSiedzKodPocztowy || undefined,
        voivodeship: detailData.praw_adSiedzWojewodztwo_Nazwa || undefined,
        county: detailData.praw_adSiedzPowiat_Nazwa || undefined,
        commune: detailData.praw_adSiedzGmina_Nazwa || undefined,
        pkdMain: detailData.praw_pkdPodstawowy_Symbol || undefined,
        pkdDescription: detailData.praw_pkdPodstawowy_Nazwa || undefined,
        legalForm: detailData.praw_formaFinansowania_Nazwa || undefined,
        registrationDate: detailData.praw_dataZapisyRegonDo || undefined,
        startDate: detailData.praw_dataPowstania || undefined,
        endDate: detailData.praw_dataZakonczeniaDzialalnosci || undefined,
        phone: detailData.praw_numerTelefonu || undefined,
        email: detailData.praw_adresEmail || undefined,
        website: detailData.praw_adresStronyinternetowej || undefined,
        status: detailData.praw_statusNip || undefined
      };

      return {
        success: true,
        data: company,
        sessionId: this.sessionId || undefined
      };

    } catch (error: any) {
      console.error('❌ Failed to parse detailed GUS response:', error.message);
      return { success: false, error: `Failed to parse detailed response: ${error.message}` };
    }
  }

  /**
   * Validate NIP checksum
   */
  static validateNIP(nip: string): boolean {
    const cleanNip = nip.replace(/[-\s]/g, '');
    
    if (!/^\d{10}$/.test(cleanNip)) {
      return false;
    }

    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const digits = cleanNip.split('').map(d => parseInt(d, 10));
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * weights[i];
    }
    
    const checksum = sum % 11;
    const lastDigit = digits[9];
    
    return checksum === lastDigit;
  }

  /**
   * Validate REGON checksum
   */
  static validateREGON(regon: string): boolean {
    const cleanRegon = regon.replace(/[-\s]/g, '');
    
    if (!/^\d{9}$|^\d{14}$/.test(cleanRegon)) {
      return false;
    }

    const weights9 = [8, 9, 2, 3, 4, 5, 6, 7];
    const weights14 = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
    
    const digits = cleanRegon.split('').map(d => parseInt(d, 10));
    const weights = cleanRegon.length === 9 ? weights9 : weights14;
    
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += digits[i] * weights[i];
    }
    
    const checksum = sum % 11;
    const lastDigit = digits[weights.length];
    
    return (checksum === 10 ? 0 : checksum) === lastDigit;
  }
}

// Export singleton instance and validation methods
export const gusRegonService = new GUSRegonService();
export const validateNIP = GUSRegonService.validateNIP;
export const validateREGON = GUSRegonService.validateREGON;
export default GUSRegonService;
