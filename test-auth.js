#!/usr/bin/env node

/**
 * Test script for Sinch Build Conversations API authentication
 * 
 * Usage:
 *   export SINCH_KEY_ID="your-key-id"
 *   export SINCH_KEY_SECRET="your-key-secret"
 *   export SINCH_REGION="us"
 *   export SINCH_PROJECT_ID="your-project-id"
 *   export SINCH_APP_ID="your-app-id"
 *   node test-auth.js
 */

const https = require('https');
const http = require('http');

// Read credentials from environment variables
// Example fake credentials (obviously fake with repeating patterns):
// const credentials = {
//   authMethod: process.env.SINCH_AUTH_METHOD || 'oauth2',
//   keyId: '11111111-1111-1111-1111-111111111111',
//   keySecret: 'FAKE-SECRET-KEY-ABCDEFGHIJKLMNOP',
//   region: process.env.SINCH_REGION || 'us',
//   projectId: '22222222-2222-2222-2222-222222222222',
//   appId: '01AAAAAAAAAAAAAAAAAAAAAAAAAA',
// };

const credentials = {
    authMethod: process.env.SINCH_AUTH_METHOD || 'oauth2',
    keyId: process.env.SINCH_KEY_ID || '00000000-0000-0000-0000-000000000000',
    keySecret: process.env.SINCH_KEY_SECRET || 'FAKE-SECRET-KEY-12345678',
    region: process.env.SINCH_REGION || 'us',
    projectId: process.env.SINCH_PROJECT_ID || 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
    appId: process.env.SINCH_APP_ID || '01ABCDEFGHIJKLMNOPQRSTUVWX',
  };

// Validate required credentials
function validateCredentials() {
  const missing = [];
  if (!credentials.keyId) missing.push('SINCH_KEY_ID');
  if (!credentials.keySecret) missing.push('SINCH_KEY_SECRET');
  if (!credentials.projectId) missing.push('SINCH_PROJECT_ID');
  if (!credentials.appId) missing.push('SINCH_APP_ID');
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nUsage:');
    console.error('  export SINCH_KEY_ID="your-key-id"');
    console.error('  export SINCH_KEY_SECRET="your-key-secret"');
    console.error('  export SINCH_REGION="us" (optional, default: us)');
    console.error('  export SINCH_PROJECT_ID="your-project-id"');
    console.error('  export SINCH_APP_ID="your-app-id"');
    console.error('  export SINCH_AUTH_METHOD="oauth2" (optional, default: oauth2)');
    console.error('  node test-auth.js');
    process.exit(1);
  }
  
  console.log('✅ All required credentials provided');
  console.log(`   Auth Method: ${credentials.authMethod}`);
  console.log(`   Region: ${credentials.region}`);
  console.log(`   Key ID: ${credentials.keyId.substring(0, 8)}...`);
  console.log(`   Project ID: ${credentials.projectId}`);
  console.log(`   App ID: ${credentials.appId}`);
  console.log('');
}

// Make HTTP request helper
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: body });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Test OAuth2.0 token fetching
async function testOAuth2Token() {
  console.log('🔐 Testing OAuth2.0 Token Fetch...');
  
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');
  const postData = 'grant_type=client_credentials';
  
  const options = {
    protocol: 'https:',
    hostname: 'auth.sinch.com',
    path: '/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  };
  
  try {
    const response = await makeRequest(options, postData);
    
    if (response.status === 200) {
      console.log('✅ OAuth2.0 token fetched successfully');
      console.log(`   Token Type: ${response.body.token_type}`);
      console.log(`   Expires In: ${response.body.expires_in} seconds`);
      console.log(`   Access Token: ${response.body.access_token.substring(0, 20)}...`);
      return response.body.access_token;
    } else {
      console.error(`❌ OAuth2.0 token fetch failed with status ${response.status}`);
      console.error('   Response:', JSON.stringify(response.body, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ OAuth2.0 token fetch error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    return null;
  }
}

// Test Basic Auth
async function testBasicAuth() {
  console.log('🔐 Testing Basic Authentication...');
  
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');
  const baseUrl = `https://${credentials.region}.conversation.api.sinch.com`;
  const endpoint = `/v1/projects/${credentials.projectId}/apps/${credentials.appId}`;
  
  const options = {
    protocol: 'https:',
    hostname: `${credentials.region}.conversation.api.sinch.com`,
    path: endpoint,
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.status === 200) {
      console.log('✅ Basic Auth test successful');
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      return true;
    } else {
      console.error(`❌ Basic Auth test failed with status ${response.status}`);
      console.error('   Response:', JSON.stringify(response.body, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Basic Auth test error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    return false;
  }
}

// Test API endpoint with OAuth2.0 token
async function testApiEndpoint(accessToken) {
  console.log('🔍 Testing API Endpoint with OAuth2.0 Token...');
  
  const baseUrl = `https://${credentials.region}.conversation.api.sinch.com`;
  const endpoint = `/v1/projects/${credentials.projectId}/apps/${credentials.appId}`;
  
  const options = {
    protocol: 'https:',
    hostname: `${credentials.region}.conversation.api.sinch.com`,
    path: endpoint,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.status === 200) {
      console.log('✅ API endpoint test successful');
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      return true;
    } else {
      console.error(`❌ API endpoint test failed with status ${response.status}`);
      console.error('   Response:', JSON.stringify(response.body, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ API endpoint test error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Sinch Build Conversations API Authentication Test\n');
  console.log('='.repeat(60));
  console.log('');
  
  validateCredentials();
  
  console.log('='.repeat(60));
  console.log('');
  
  if (credentials.authMethod === 'oauth2') {
    // Test OAuth2.0 flow
    const token = await testOAuth2Token();
    console.log('');
    
    if (token) {
      await testApiEndpoint(token);
    } else {
      console.log('⚠️  Skipping API endpoint test (OAuth2.0 token fetch failed)');
    }
  } else {
    // Test Basic Auth
    await testBasicAuth();
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Test completed');
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


