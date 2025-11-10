# Quick Start Guide: Sinch Build Conversations n8n Connector

## 🚀 Fast Track to Implementation

This is your quick reference for building the Sinch Build Conversations API connector. See `SINCH_CONVERSATIONS_CONNECTOR_PLAN.md` for complete details.

---

## Key Differences from n8n-engage

| Aspect               | n8n-engage (MessageMedia) | n8n-conversations (Sinch)             |
| -------------------- | ------------------------- | ------------------------------------- |
| **Auth**             | Basic Auth only           | OAuth2.0 + Basic Auth                 |
| **Endpoints**        | Single URL                | Regional (US/EU/BR)                   |
| **Complexity**       | Simple flat structure     | Nested objects                        |
| **Required IDs**     | API Key + Secret          | Key ID + Secret + Project ID + App ID |
| **Token Management** | None                      | OAuth2.0 with 1hr caching             |

---

## Implementation Order

### 1️⃣ **Day 1-3: Setup**
```bash
cd /Users/liaher/Developer/connectors/n8n/n8n-build
mkdir -p n8n-nodes-sinch-conversations
cd n8n-nodes-sinch-conversations

# Copy package.json template from plan
# Copy tsconfig.json from n8n-engage
# Install dependencies
npm install
```

**Files to create:**
- `package.json` (from plan)
- `tsconfig.json` (copy from n8n-engage)
- `.gitignore`
- `vitest.config.ts` (copy from n8n-engage)

### 2️⃣ **Day 4-5: Credentials & Auth**
**Priority:** OAuth2.0 token management!

**File:** `src/credentials/SinchConversationsApi.credentials.ts`
- Add 5 credential fields: keyId, keySecret, region, projectId, appId
- Add authMethod selection (oauth2 vs basic)
- Implement credential test

**File:** `src/utils/sinchConversationsHttp.ts`
- Implement `getAccessToken()` with caching
- Cache tokens for 55 minutes (5min buffer before expiry)
- POST to `https://auth.sinch.com/oauth2/token`
- Implement `makeSinchConversationsRequest()` helper

### 3️⃣ **Day 6-8: Send Message**
**File:** `src/nodes/SinchConversations/providers/SinchConversationsProvider.ts`

**Request format:**
```typescript
{
  app_id: string,
  recipient: {
    identified_by: {
      channel_identities: [{
        channel: "SMS",
        identity: "+15551234567"  // E.164!
      }]
    }
  },
  message: {
    text_message: {
      text: "Your message here"
    }
  },
  channel_priority_order: ["SMS"]
}
```

**Endpoint:** `POST /v1/projects/{projectId}/messages:send`

### 4️⃣ **Day 9-10: List Messages**
**Endpoint:** `GET /v1/projects/{projectId}/messages`

**Query params:**
- `app_id` (required)
- `contact_id` (optional)
- `conversation_id` (optional)
- `start_time` / `end_time` (ISO 8601)
- `page_size` (default: 10, max: 1000)
- `channel` (optional: SMS, WHATSAPP, etc.)

### 5️⃣ **Day 11-13: Testing**
**Copy test structure from n8n-engage:**
- Mock OAuth2.0 token fetch
- Mock send message API calls
- Test phone normalization
- Test error handling
- Test regional endpoints

### 6️⃣ **Day 14-15: Documentation**
- README.md with setup guide
- CHANGELOG.md starting at 1.0.0-alpha-0
- DEPLOYMENT.md (adapt from n8n-engage)

### 7️⃣ **Day 16: Deploy Alpha**
```bash
npm run build
npm run test
./deploy/deploy-to-npm.sh
```

---

## Critical Implementation Notes

### ⚠️ OAuth2.0 Token Caching
```typescript
// Token cache structure
const tokenCache = new Map<string, { 
  token: string; 
  expiresAt: number 
}>();

// Fetch new token only if:
// 1. Not in cache, OR
// 2. Expires in < 5 minutes
if (!cached || cached.expiresAt < Date.now() + 5*60*1000) {
  // Fetch new token
}
```

### ⚠️ Regional Endpoint Selection
```typescript
function getBaseUrl(region: 'us' | 'eu' | 'br'): string {
  const urls = {
    us: 'https://us.conversation.api.sinch.com',
    eu: 'https://eu.conversation.api.sinch.com',
    br: 'https://br.conversation.api.sinch.com',
  };
  return urls[region] || urls.us;
}
```

### ⚠️ Phone Number Format
- **MUST** be E.164: `+[country_code][number]`
- Use `google-libphonenumber` for normalization
- Copy `phone.ts` utils from n8n-engage

### ⚠️ Nested Message Structure
```typescript
// ❌ WRONG (MessageMedia format)
{
  messages: [{
    content: "Hello",
    destination_number: "+1234",
    source_number: "+5678"
  }]
}

// ✅ CORRECT (Sinch Build Conversations format)
{
  app_id: "01ABC...",
  recipient: {
    identified_by: {
      channel_identities: [{
        channel: "SMS",
        identity: "+1234"
      }]
    }
  },
  message: {
    text_message: {
      text: "Hello"
    }
  }
}
```

---

## Code Snippets to Copy

### From n8n-engage (Reuse These!)
1. ✅ `src/utils/phone.ts` - Phone normalization
2. ✅ `src/utils/errors.ts` - Error classes
3. ✅ `src/nodes/SinchConversations/types.ts` - Basic type structure (adapt)
4. ✅ `tests/__mocks__/n8n-workflow.ts` - Test mocks
5. ✅ `deploy/deploy-to-npm.sh` - Deployment script
6. ✅ `.gitignore`, `vitest.config.ts`, `tsconfig.json`

### New Files (Write from Scratch)
1. ❌ `src/utils/sinchConversationsHttp.ts` - OAuth2.0 + regional endpoints
2. ❌ `src/credentials/SinchConversationsApi.credentials.ts` - Multi-field credentials
3. ❌ `src/nodes/SinchConversations/providers/SinchConversationsProvider.ts` - Nested request format
4. ❌ `src/nodes/SinchConversations/SinchConversations.node.ts` - Node with List operation

---

## Testing Checklist

### Credentials
- [ ] OAuth2.0 token fetch works
- [ ] Token is cached for ~55 minutes
- [ ] Basic auth fallback works
- [ ] Regional endpoints (US/EU/BR) work
- [ ] Credential test endpoint succeeds

### Send Message
- [ ] SMS sends to +1 (US) number
- [ ] SMS sends to +44 (UK) number
- [ ] Phone normalization from local format works
- [ ] Callback URL is included in request
- [ ] Metadata is included in request
- [ ] Error on invalid phone number
- [ ] Error on empty message
- [ ] Error on message > 1600 chars

### List Messages
- [ ] List all messages for app
- [ ] Filter by contact_id
- [ ] Filter by conversation_id
- [ ] Filter by date range (start_time/end_time)
- [ ] Pagination with page_size works
- [ ] Filter by channel (SMS) works

### Error Handling
- [ ] 401 Unauthorized (invalid credentials)
- [ ] 403 Forbidden (wrong project_id)
- [ ] 404 Not Found (wrong app_id)
- [ ] 429 Rate Limit
- [ ] 500 Server Error

---

## Common Pitfalls to Avoid

### 1. ❌ Forgetting to include `app_id` in every request
```typescript
// Every request needs app_id in body or query
{ app_id: credentials.appId, ... }
```

### 2. ❌ Using MessageMedia's flat structure
```typescript
// Don't copy-paste the MessageMediaProvider directly!
// Sinch uses nested objects for recipient and message
```

### 3. ❌ Not handling OAuth2.0 token expiration
```typescript
// MUST cache tokens and check expiry
// Fetching new token on every request = rate limit death
```

### 4. ❌ Hardcoding region to "us"
```typescript
// ALWAYS use credentials.region
const baseUrl = getBaseUrl(credentials.region);
```

### 5. ❌ Forgetting channel_identities array
```typescript
// Must be an array, even for single SMS recipient
recipient: {
  identified_by: {
    channel_identities: [  // <-- ARRAY!
      { channel: "SMS", identity: "+1234" }
    ]
  }
}
```

---

## File Structure Checklist

```
n8n-nodes-sinch-conversations/
├── ✅ package.json (from plan)
├── ✅ tsconfig.json (copy from n8n-engage)
├── ✅ README.md
├── ✅ CHANGELOG.md
├── ✅ DEPLOYMENT.md
├── ✅ LICENSE (copy from n8n-engage)
├── ✅ .gitignore (copy from n8n-engage)
├── ✅ vitest.config.ts (copy from n8n-engage)
├── deploy/
│   ├── ✅ deploy-to-npm.sh (copy + adapt)
│   └── ✅ unpublish-dev-package.sh (copy + adapt)
├── src/
│   ├── ✅ index.ts (simple exports)
│   ├── credentials/
│   │   └── ❌ SinchConversationsApi.credentials.ts (NEW)
│   ├── nodes/
│   │   └── SinchConversations/
│   │       ├── ❌ SinchConversations.node.ts (NEW)
│   │       ├── ❌ types.ts (NEW, adapted)
│   │       ├── ✅ sinch-logo.png (use Sinch logo)
│   │       └── providers/
│   │           ├── ✅ ProviderStrategy.ts (copy from n8n-engage)
│   │           └── ❌ SinchConversationsProvider.ts (NEW)
│   └── utils/
│       ├── ✅ errors.ts (copy from n8n-engage)
│       ├── ✅ phone.ts (copy from n8n-engage)
│       └── ❌ sinchConversationsHttp.ts (NEW)
├── tests/
│   ├── ✅ __mocks__/n8n-workflow.ts (copy from n8n-engage)
│   └── ❌ SinchConversations.node.test.ts (NEW)
└── examples/
    └── ✅ basic-sms-workflow.json (NEW)
```

**Legend:**
- ✅ = Copy/reuse from n8n-engage
- ❌ = Write new (Sinch-specific)

---

## API Credentials for Testing

### Get Your Sinch Credentials
1. Go to https://dashboard.sinch.com
2. Create a project (if you don't have one)
3. Settings → Access Keys
4. Click "Create Access Key"
5. Save the **Key ID** and **Key Secret** (only shown once!)
6. Create a Conversations API app
7. Note your **Project ID** and **App ID**

### Test Numbers
- For testing: Use your own phone number
- For production: Use real customer numbers

---

## Deployment Commands

```bash
# Build
npm run build

# Test
npm run test

# Deploy alpha
./deploy/deploy-to-npm.sh

# Check deployment
npm view @sinch-engage/n8n-nodes-sinch-conversations versions
```

---

## Resources

### Quick Links
- **Full Plan**: `SINCH_CONVERSATIONS_CONNECTOR_PLAN.md`
- **API Docs**: https://developers.sinch.com/docs/conversation/api-reference/
- **n8n-engage Reference**: `/n8n/n8n-engage/`
- **n8n Docs**: https://docs.n8n.io/integrations/creating-nodes/

### Key API Endpoints
- **Auth**: `https://auth.sinch.com/oauth2/token`
- **Send Message**: `https://{region}.conversation.api.sinch.com/v1/projects/{projectId}/messages:send`
- **List Messages**: `https://{region}.conversation.api.sinch.com/v1/projects/{projectId}/messages`

---

## Need Help?

1. Check the full plan: `SINCH_CONVERSATIONS_CONNECTOR_PLAN.md`
2. Review n8n-engage implementation: `/n8n/n8n-engage/src/`
3. Read Sinch docs: https://developers.sinch.com/docs/conversation/
4. Test in Postman first: https://www.postman.com/collections/23476432-04d72265-d912-405c-b46e-b8afe2d5fddf

---

**Ready to build? Start with Day 1-3 setup, then tackle OAuth2.0 next!** 🚀
