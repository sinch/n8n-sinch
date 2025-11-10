# Authentication Testing Guide

This guide helps you test and debug Sinch Build Conversations API authentication using the CLI test script.

## Quick Start

1. Set your credentials as environment variables:

```bash
export SINCH_KEY_ID="your-key-id"
export SINCH_KEY_SECRET="your-key-secret"
export SINCH_REGION="us"  # or "eu" or "br"
export SINCH_PROJECT_ID="your-project-id"
export SINCH_APP_ID="your-app-id"
export SINCH_AUTH_METHOD="oauth2"  # or "basic" (optional, default: oauth2)
```

2. Run the test script:

```bash
cd /Users/liaher/Developer/connectors/n8n/n8n-build/n8n-nodes-sinch-build-conversations
node test-auth.js
```

## What the Test Does

The test script performs the following checks:

### For OAuth2.0 Authentication:
1. **OAuth2.0 Token Fetch** - Tests fetching an access token from `https://auth.sinch.com/oauth2/token`
2. **API Endpoint Test** - Tests making an authenticated request to the Conversations API using the Bearer token

### For Basic Authentication:
1. **Basic Auth Test** - Tests making an authenticated request using Basic Auth headers

## Expected Output

### Successful OAuth2.0 Test:
```
🚀 Sinch Build Conversations API Authentication Test
============================================================

✅ All required credentials provided
   Auth Method: oauth2
   Region: us
   Key ID: abc12345...
   Project ID: 00000000-0000-0000-0000-000000000000
   App ID: 01AAAAAAAAAAAAAAAAAAAAAAAAAA

============================================================

🔐 Testing OAuth2.0 Token Fetch...
✅ OAuth2.0 token fetched successfully
   Token Type: Bearer
   Expires In: 3600 seconds
   Access Token: eyJhbGciOiJSUzI1NiIs...

🔍 Testing API Endpoint with OAuth2.0 Token...
✅ API endpoint test successful
   Response: { ... }

============================================================
✅ Test completed
```

### Failed Test Example:
```
❌ OAuth2.0 token fetch failed with status 401
   Response: {
     "error": "invalid_client",
     "error_description": "Invalid credentials"
   }
```

## Troubleshooting

### Error: "Missing required environment variables"
- Make sure all required environment variables are set
- Check that variable names match exactly (case-sensitive)

### Error: "OAuth2.0 token fetch failed with status 401"
- **Invalid credentials**: Check your Key ID and Key Secret
- **Wrong region**: Ensure your credentials match the region you're using
- **Expired credentials**: Generate new API keys in the Sinch dashboard

### Error: "API endpoint test failed with status 403"
- **Wrong Project ID**: Verify the Project ID matches your credentials
- **Wrong App ID**: Verify the App ID exists in your project
- **Region mismatch**: Ensure the region matches where your app was created

### Error: "API endpoint test failed with status 404"
- **Invalid App ID**: The App ID doesn't exist
- **Wrong endpoint**: Check that the Project ID and App ID are correct
- **Region mismatch**: The app might be in a different region

### Error: "Connection timeout" or network errors
- Check your internet connection
- Verify the Sinch API is accessible from your network
- Check firewall/proxy settings

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SINCH_KEY_ID` | Yes | Your Sinch API Key ID | `abc12345-6789-...` |
| `SINCH_KEY_SECRET` | Yes | Your Sinch API Key Secret | `xyz98765-4321-...` |
| `SINCH_REGION` | No | Region (us/eu/br) | `us` (default) |
| `SINCH_PROJECT_ID` | Yes | Your Sinch Project ID | `00000000-0000-...` |
| `SINCH_APP_ID` | Yes | Your Conversation API App ID | `01AAAAAAAAAA...` |
| `SINCH_AUTH_METHOD` | No | Auth method (oauth2/basic) | `oauth2` (default) |

## Testing Different Scenarios

### Test OAuth2.0:
```bash
export SINCH_AUTH_METHOD="oauth2"
node test-auth.js
```

### Test Basic Auth:
```bash
export SINCH_AUTH_METHOD="basic"
node test-auth.js
```

### Test Different Regions:
```bash
export SINCH_REGION="eu"  # or "br"
node test-auth.js
```

## Next Steps

If the test passes:
1. The credentials are valid
2. Try using them in n8n
3. If n8n still fails, check the n8n logs for more details

If the test fails:
1. Review the error message
2. Verify credentials in the Sinch dashboard
3. Check the troubleshooting section above
4. Contact Sinch support if credentials are confirmed correct

## Viewing n8n Logs

To see detailed error messages in n8n:

```bash
cd /Users/liaher/Developer/connectors/n8n/n8n-docker
docker-compose logs n8n --tail=100 | grep -i "sinch\|conversation\|error"
```

Or view all logs:
```bash
docker-compose logs n8n --tail=100
```


