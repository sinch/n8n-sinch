#!/usr/bin/env node

/**
 * Test script for Sinch Build Conversations API authentication via Econexus
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
const { version: connectorVersion } = require('./package.json');

const credentials = {
  keyId: process.env.SINCH_KEY_ID || '00000000-0000-0000-0000-000000000000',
  keySecret: process.env.SINCH_KEY_SECRET || 'FAKE-SECRET-KEY-12345678',
  region: process.env.SINCH_REGION || 'us',
  projectId: process.env.SINCH_PROJECT_ID || 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
  appId: process.env.SINCH_APP_ID || '01ABCDEFGHIJKLMNOPQRSTUVWX',
};

function getEconexusHostPrefix(region) {
  return region === 'eu' ? 'eu' : 'au';
}

function getEconexusBaseUrl(region) {
  return `https://${getEconexusHostPrefix(region)}.app.api.sinch.com`;
}

function buildProxyHeaders() {
  return {
    'X-AUTH-SOURCE': 'SINCH-BUILD',
    'X-SINCH-APP-ID': credentials.appId,
    'X-SINCH-PROJECT-ID': credentials.projectId,
    'X-CLIENT-SOURCE': 'n8n-sinch-build',
    'X-CLIENT-SOURCE-VERSION': connectorVersion,
  };
}

function validateCredentials() {
  const missing = [];
  if (!credentials.keyId) missing.push('SINCH_KEY_ID');
  if (!credentials.keySecret) missing.push('SINCH_KEY_SECRET');
  if (!credentials.projectId) missing.push('SINCH_PROJECT_ID');
  if (!credentials.appId) missing.push('SINCH_APP_ID');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('\nUsage:');
    console.error('  export SINCH_KEY_ID="your-key-id"');
    console.error('  export SINCH_KEY_SECRET="your-key-secret"');
    console.error('  export SINCH_REGION="us" (optional, default: us)');
    console.error('  export SINCH_PROJECT_ID="your-project-id"');
    console.error('  export SINCH_APP_ID="your-app-id"');
    console.error('  node test-auth.js');
    process.exit(1);
  }

  console.log('✅ All required credentials provided');
  console.log(`   Auth Method: OAuth2.0`);
  console.log(`   Region: ${credentials.region}`);
  console.log(`   Econexus Host: ${getEconexusBaseUrl(credentials.region)}`);
  console.log(`   Key ID: ${credentials.keyId.substring(0, 8)}...`);
  console.log(`   Project ID: ${credentials.projectId}`);
  console.log(`   App ID: ${credentials.appId}`);
  console.log('');
}

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
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testOAuth2Token() {
  console.log('🔐 Testing OAuth2.0 Token Fetch...');

  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');
  const postData = 'grant_type=client_credentials';

  const options = {
    protocol: 'https:',
    hostname: `${credentials.region}.auth.sinch.com`,
    path: '/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
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
    }

    console.error(`❌ OAuth2.0 token fetch failed with status ${response.status}`);
    console.error('   Response:', JSON.stringify(response.body, null, 2));
    return null;
  } catch (error) {
    console.error('❌ OAuth2.0 token fetch error:', error.message);
    return null;
  }
}

async function testEconexusEndpoint(accessToken) {
  console.log('🔍 Testing Econexus Sinch Build proxy...');

  const hostname = `${getEconexusHostPrefix(credentials.region)}.app.api.sinch.com`;
  const path = `/v1/econexus/sinch-build/v1/projects/${credentials.projectId}/apps?isTestingAuth=true`;

  const options = {
    protocol: 'https:',
    hostname,
    path,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...buildProxyHeaders(),
    },
  };

  try {
    const response = await makeRequest(options);

    if (response.status === 200) {
      console.log('✅ Econexus endpoint test successful');
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      return true;
    }

    console.error(`❌ Econexus endpoint test failed with status ${response.status}`);
    console.error('   Response:', JSON.stringify(response.body, null, 2));
    return false;
  } catch (error) {
    console.error('❌ Econexus endpoint test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Sinch Build Econexus Authentication Test\n');
  console.log('='.repeat(60));
  console.log('');

  validateCredentials();

  console.log('='.repeat(60));
  console.log('');

  const token = await testOAuth2Token();
  console.log('');

  if (token) {
    await testEconexusEndpoint(token);
  } else {
    console.log('⚠️  Skipping Econexus endpoint test (OAuth2.0 token fetch failed)');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Test completed');
}

runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
