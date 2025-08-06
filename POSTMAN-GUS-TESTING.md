# 📮 GUS REGON Service - Postman Testing Guide

This guide helps you test the GUS REGON service using Postman with your deployed backend.

## 🌐 Base URL

Replace `{{baseUrl}}` with your actual backend URL:
```
https://polishinvoicingback-1.onrender.com
```

## 📋 Postman Collection Setup

### 1. Create Environment Variables

In Postman, create a new environment with these variables:

| Variable | Value |
|----------|-------|
| `baseUrl` | `https://polishinvoicingback-1.onrender.com` |
| `testNIP` | `5260001246` |
| `testREGON` | `020880482` |
| `invalidNIP` | `1234567890` |
| `invalidREGON` | `123456789` |

### 2. Collection Structure

Create a collection called "GUS REGON API Tests" with these requests:

## 🧪 Test Requests

### ✅ **1. Service Configuration**
```http
GET {{baseUrl}}/api/gus/config
```

**Expected Response:**
```json
{
  "environment": "test",
  "testMode": true,
  "apiKeyConfigured": false,
  "apiKeySource": "default_test_key",
  "message": "🧪 Using GUS test environment - Default test key available",
  "features": [
    "Company data by NIP",
    "Company data by REGON",
    "Detailed company information",
    "..."
  ],
  "endpoints": {...},
  "setup": {...}
}
```

### ✅ **2. Health Check**
```http
GET {{baseUrl}}/api/gus/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "GUS REGON API",
  "environment": "test",
  "timestamp": "2025-08-06T...",
  "version": "1.0.0"
}
```

### ✅ **3. Validate NIP and REGON**
```http
POST {{baseUrl}}/api/gus/validate
Content-Type: application/json

{
  "nip": "{{testNIP}}",
  "regon": "{{testREGON}}"
}
```

**Expected Response:**
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
      "value": "020880482",
      "valid": true,
      "cleaned": "020880482",
      "message": "Valid REGON"
    }
  }
}
```

### ✅ **4. Search by NIP (Basic)**
```http
GET {{baseUrl}}/api/gus/company/nip/{{testNIP}}
```

**Expected Response:**
```json
{
  "searchType": "NIP",
  "searchValue": "5260001246",
  "success": true,
  "data": {
    "nip": "5260001246",
    "regon": "020880482",
    "name": "GŁÓWNY URZĄD STATYSTYCZNY",
    "city": "WARSZAWA",
    "postalCode": "00-925",
    "street": "AL. NIEPODLEGŁOŚCI",
    "houseNumber": "208"
  }
}
```

### ✅ **5. Search by NIP (With Details)**
```http
GET {{baseUrl}}/api/gus/company/nip/{{testNIP}}?details=true
```

**Expected Response:**
```json
{
  "searchType": "NIP",
  "searchValue": "5260001246",
  "success": true,
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
    "phone": "22 608 30 00",
    "email": "informacje@stat.gov.pl",
    "website": "https://stat.gov.pl",
    "pkdMain": "8411Z",
    "pkdDescription": "Ogólne zarządzanie administracją publiczną"
  }
}
```

### ✅ **6. Search by REGON**
```http
GET {{baseUrl}}/api/gus/company/regon/{{testREGON}}
```

### ✅ **7. Universal Search (NIP)**
```http
GET {{baseUrl}}/api/gus/search/{{testNIP}}
```

### ✅ **8. Universal Search (REGON)**
```http
GET {{baseUrl}}/api/gus/search/{{testREGON}}
```

### ✅ **9. Universal Search with Details**
```http
GET {{baseUrl}}/api/gus/search/{{testNIP}}?details=true
```

### ❌ **10. Invalid NIP Test**
```http
GET {{baseUrl}}/api/gus/company/nip/{{invalidNIP}}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid NIP format or checksum",
  "details": "NIP must be 10 digits with valid checksum"
}
```

### ❌ **11. Invalid REGON Test**
```http
GET {{baseUrl}}/api/gus/company/regon/{{invalidREGON}}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid REGON format or checksum",
  "details": "REGON must be 9 or 14 digits with valid checksum"
}
```

### ✅ **12. Company Details (by REGON)**
```http
GET {{baseUrl}}/api/gus/company/{{testREGON}}/details
```

## 📊 **Postman Tests (JavaScript)**

Add these test scripts to your Postman requests:

### For Configuration Endpoint:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains environment info", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('environment');
    pm.expect(jsonData).to.have.property('testMode');
    pm.expect(jsonData).to.have.property('features');
});

pm.test("Features array is not empty", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.features).to.be.an('array').that.is.not.empty;
});
```

### For Validation Endpoint:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Validation successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData).to.have.property('validation');
});

pm.test("NIP validation is correct", function () {
    const jsonData = pm.response.json();
    if (jsonData.validation.nip) {
        pm.expect(jsonData.validation.nip.valid).to.be.true;
        pm.expect(jsonData.validation.nip.message).to.equal("Valid NIP");
    }
});
```

### For Company Search:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Company found successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData.data).to.have.property('name');
});

pm.test("Company has required fields", function () {
    const jsonData = pm.response.json();
    const company = jsonData.data;
    pm.expect(company).to.have.property('name');
    pm.expect(company).to.have.property('city');
    pm.expect(company.name).to.not.be.empty;
});

// Save company data for use in other tests
pm.test("Save company data", function () {
    const jsonData = pm.response.json();
    if (jsonData.success && jsonData.data) {
        pm.environment.set("foundCompanyName", jsonData.data.name);
        pm.environment.set("foundCompanyREGON", jsonData.data.regon);
    }
});
```

### For Error Cases:
```javascript
pm.test("Status code is 400 for invalid input", function () {
    pm.response.to.have.status(400);
});

pm.test("Error response format is correct", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
    pm.expect(jsonData).to.have.property('error');
});
```

## 🚀 **Quick Test Sequence**

Run these requests in order:

1. **Health Check** → Verify service is running
2. **Configuration** → Check environment and API key status  
3. **Validation** → Test NIP/REGON validation
4. **Basic Search** → Search by valid NIP
5. **Detailed Search** → Search with details=true
6. **Universal Search** → Test auto-detection
7. **Error Handling** → Test invalid inputs

## 🔧 **Advanced Testing**

### Environment Switching Test:
```javascript
// In pre-request script, test different environments
pm.sendRequest({
    url: pm.environment.get("baseUrl") + "/api/gus/config",
    method: 'GET'
}, function (err, response) {
    console.log("Current environment:", response.json().environment);
});
```

### Batch Validation Test:
```javascript
// Test multiple NIPs in sequence
const testNIPs = ["5260001246", "1234567890", "9999999999"];
const validationPromises = testNIPs.map(nip => {
    return pm.sendRequest({
        url: `${pm.environment.get("baseUrl")}/api/gus/validate`,
        method: 'POST',
        header: {'Content-Type': 'application/json'},
        body: {mode: 'raw', raw: JSON.stringify({nip: nip})}
    });
});
```

## 📋 **Expected Test Results Summary**

| Test Case | Expected Status | Expected Result |
|-----------|----------------|-----------------|
| Health Check | ✅ 200 | Service healthy |
| Configuration | ✅ 200 | Test mode, features listed |
| Valid NIP Search | ✅ 200 | Company data returned |
| Valid REGON Search | ✅ 200 | Company data returned |
| Invalid NIP | ❌ 400 | Validation error |
| Invalid REGON | ❌ 400 | Validation error |
| Universal Search | ✅ 200 | Auto-detection works |
| Detailed Search | ✅ 200 | Enhanced company data |

## 🆘 **Troubleshooting**

### Common Issues:

1. **500 Error**: Backend not deployed or crashed
2. **404 Error**: Wrong endpoint URL
3. **CORS Error**: Frontend origin not allowed
4. **Timeout**: GUS service temporarily unavailable

### Debug Steps:

1. Check backend logs on Render/deployment platform
2. Verify environment variables are set
3. Test health endpoint first
4. Check configuration endpoint for API key status

This comprehensive testing approach will help you verify that your GUS REGON service is working correctly! 🎯
