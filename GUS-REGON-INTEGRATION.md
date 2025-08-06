# GUS REGON Integration Guide

This document explains how to integrate with the Polish Central Statistical Office (GUS) REGON database to fetch company information by NIP or REGON numbers.

## 🎯 Overview

The GUS REGON service allows you to:
- Fetch company data by NIP (tax identification number)
- Fetch company data by REGON (statistical number)
- Get detailed company information including address, contacts, and business activities
- Validate NIP and REGON numbers with checksum verification
- Use both test and production environments

## 🔧 Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# GUS REGON API Configuration
GUS_API_KEY=your-gus-api-key-here          # Your registered API key (required for production)
GUS_USE_TEST=true                          # Set to 'false' for production environment
```

### Getting an API Key

1. **Test Environment**: No registration required, uses default test key
2. **Production Environment**: 
   - Visit: https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx
   - Register for free API key
   - Add key to `GUS_API_KEY` environment variable
   - Set `GUS_USE_TEST=false`

## 📡 API Endpoints

### Configuration
```http
GET /api/gus/config
```
Returns current GUS service configuration and setup information.

### Validation
```http
POST /api/gus/validate
Content-Type: application/json

{
  "nip": "1234567890",     // Optional
  "regon": "123456785"     // Optional
}
```

### Search by NIP
```http
GET /api/gus/company/nip/5260001246
GET /api/gus/company/nip/5260001246?details=true
```

### Search by REGON
```http
GET /api/gus/company/regon/123456785
GET /api/gus/company/regon/123456785?details=true
```

### Universal Search
```http
GET /api/gus/search/5260001246           # Auto-detects NIP
GET /api/gus/search/123456785            # Auto-detects REGON
GET /api/gus/search/5260001246?details=true
```

### Detailed Information
```http
GET /api/gus/company/{regon}/details
```

### Health Check
```http
GET /api/gus/health
```

## 📝 Response Format

### Successful Response
```json
{
  "success": true,
  "searchType": "NIP",
  "searchValue": "5260001246",
  "data": {
    "nip": "5260001246",
    "regon": "020880482",
    "name": "GŁÓWNY URZĄD STATYSTYCZNY",
    "shortName": "GUS",
    "street": "AL. NIEPODLEGŁOŚCI",
    "houseNumber": "208",
    "city": "WARSZAWA",
    "postalCode": "00-925",
    "voivodeship": "MAZOWIECKIE",
    "county": "M. ST. WARSZAWA",
    "commune": "ŚRÓDMIEŚCIE",
    "pkdMain": "8411Z",
    "pkdDescription": "Ogólne zarządzanie administracją publiczną",
    "legalForm": "ORGANY ADMINISTRACJI RZĄDOWEJ",
    "registrationDate": "2007-06-20",
    "status": "AKTYWNY",
    "phone": "22 608 30 00",
    "email": "informacje@stat.gov.pl",
    "website": "https://stat.gov.pl"
  },
  "sessionId": "session-id-here"
}
```

### Error Response
```json
{
  "success": false,
  "error": "No company found for NIP: 1234567890",
  "searchType": "NIP",
  "searchValue": "1234567890"
}
```

### Validation Response
```json
{
  "success": true,
  "validation": {
    "nip": {
      "value": "5260001246",
      "valid": true,
      "cleaned": "5260001246",
      "message": "Valid NIP"
    },
    "regon": {
      "value": "123456785",
      "valid": true,
      "cleaned": "123456785",
      "message": "Valid REGON"
    }
  }
}
```

## 💻 Frontend Integration Examples

### Basic Company Lookup
```javascript
async function lookupCompany(nipOrRegon) {
  try {
    const response = await fetch(`/api/gus/search/${nipOrRegon}?details=true`);
    const result = await response.json();
    
    if (result.success) {
      console.log('Company found:', result.data.name);
      console.log('Address:', `${result.data.street} ${result.data.houseNumber}, ${result.data.city}`);
      return result.data;
    } else {
      console.error('Company not found:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Lookup error:', error);
    return null;
  }
}
```

### Validation Before Search
```javascript
async function validateAndSearch(identifier) {
  // First validate the identifier
  const validateResponse = await fetch('/api/gus/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      nip: identifier.length === 10 ? identifier : undefined,
      regon: identifier.length !== 10 ? identifier : undefined
    })
  });
  
  const validation = await validateResponse.json();
  
  const isNIP = identifier.length === 10;
  const validationResult = validation.validation?.[isNIP ? 'nip' : 'regon'];
  
  if (!validationResult?.valid) {
    console.error('Invalid identifier:', validationResult?.message);
    return null;
  }
  
  // If valid, search for company
  return await lookupCompany(identifier);
}
```

### Auto-fill Invoice Form
```javascript
async function fillInvoiceForm(nipOrRegon) {
  const company = await lookupCompany(nipOrRegon);
  
  if (company) {
    // Fill form fields
    document.getElementById('companyName').value = company.name;
    document.getElementById('nip').value = company.nip || '';
    document.getElementById('regon').value = company.regon || '';
    document.getElementById('street').value = company.street || '';
    document.getElementById('houseNumber').value = company.houseNumber || '';
    document.getElementById('city').value = company.city;
    document.getElementById('postalCode').value = company.postalCode || '';
    document.getElementById('phone').value = company.phone || '';
    document.getElementById('email').value = company.email || '';
    document.getElementById('pkd').value = company.pkdMain || '';
    
    // Build full address
    const fullAddress = [
      company.street,
      company.houseNumber,
      company.apartmentNumber
    ].filter(Boolean).join(' ');
    
    document.getElementById('address').value = fullAddress;
  }
}
```

### React Hook Example
```javascript
import { useState, useCallback } from 'react';

export function useGUSLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const lookup = useCallback(async (identifier) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/gus/search/${identifier}?details=true`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { lookup, loading, error };
}
```

## 🧪 Testing

### Run Tests
```bash
# Test the GUS service
npm run test:gus

# Test specific endpoints
curl https://polishinvoicingback-1.onrender.com/api/gus/config
curl https://polishinvoicingback-1.onrender.com/api/gus/search/5260001246
```

### Test Data
Use these test identifiers:
- **NIP**: `5260001246` (GUS - Central Statistical Office)
- **REGON**: `020880482` (GUS - Central Statistical Office)

## ⚠️ Important Notes

1. **Rate Limiting**: GUS API has rate limits, implement caching in production
2. **Session Management**: Service handles session login/logout automatically
3. **Data Quality**: Not all companies have complete information (phone, email, etc.)
4. **Validation**: Always validate NIP/REGON before making API calls
5. **Error Handling**: Handle both validation errors and API failures gracefully

## 🔒 Security

- API keys are handled securely through environment variables
- No sensitive data is logged (keys are masked in logs)
- Session management is automatic and secure
- HTTPS is enforced for production use

## 📈 Performance Tips

1. **Cache Results**: Store successful lookups to avoid repeated API calls
2. **Validate First**: Use validation endpoint before searching
3. **Batch Requests**: If possible, batch multiple lookups
4. **Handle Timeouts**: Implement reasonable timeout values
5. **Fallback Strategy**: Have fallback for when GUS service is unavailable

## 🆘 Troubleshooting

### Common Issues

1. **"No API key configured"**
   - Add `GUS_API_KEY` to environment variables
   - For production, register at GUS website

2. **"Invalid NIP/REGON format"**
   - Ensure 10 digits for NIP
   - Ensure 9 or 14 digits for REGON
   - Remove dashes and spaces

3. **"Company not found"**
   - Verify the NIP/REGON exists in GUS database
   - Check if company is active
   - Try alternative search methods

4. **"Session timeout"**
   - Service automatically handles session renewal
   - Check network connectivity
   - Verify GUS service availability

### Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
```

This will show detailed API communication and session management logs.

## 🔗 Related Services

This GUS REGON service integrates perfectly with:
- **KSeF Mock Service**: For invoice processing
- **Invoice Generation**: Auto-fill company data
- **VAT Validation**: Cross-reference with EU VAT system
- **Company Verification**: Validate business partners

## 📚 External Resources

- [GUS BIR Database](https://wyszukiwarkaregon.stat.gov.pl/)
- [API Registration](https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx)
- [GUS Documentation](https://api.stat.gov.pl/Home/RegonApi)
- [NIP Validation Rules](https://pl.wikipedia.org/wiki/NIP)
- [REGON Information](https://pl.wikipedia.org/wiki/REGON)
