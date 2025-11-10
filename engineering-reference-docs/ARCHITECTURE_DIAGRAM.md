# Architecture Diagram: Sinch Build Conversations n8n Connector

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         n8n Workflow                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         Sinch Build Conversations Node                       │   │
│  │  (n8n-nodes-sinch-conversations)                       │   │
│  └────────────────┬───────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │  SinchConversations.node.ts       │
    │  - Resource: message              │
    │  - Operations: send, list         │
    └───────────┬───────────────────────┘
                │
                ▼
    ┌───────────────────────────────────┐
    │  Credentials Manager              │
    │  (SinchConversationsApi)          │
    │  - keyId, keySecret               │
    │  - region, projectId, appId       │
    └───────────┬───────────────────────┘
                │
                ▼
    ┌───────────────────────────────────┐
    │  sinchConversationsHttp.ts        │
    │  - OAuth2.0 Token Management      │
    │  - Token Caching (55min)          │
    │  - Regional Endpoint Selection    │
    └───────────┬───────────────────────┘
                │
                ▼
    ┌───────────────────────────────────┐
    │  SinchConversationsProvider.ts    │
    │  - Build Send Request             │
    │  - Parse Response                 │
    └───────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│         Sinch Build Conversations API               │
│                                               │
│  Auth: https://auth.sinch.com/oauth2/token   │
│  US:   https://us.conversation.api.sinch.com │
│  EU:   https://eu.conversation.api.sinch.com │
│  BR:   https://br.conversation.api.sinch.com │
└───────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌─────────────┐
│   n8n User  │
└──────┬──────┘
       │ 1. Configure Credentials
       │    - Key ID
       │    - Key Secret
       │    - Region (US/EU/BR)
       │    - Project ID
       │    - App ID
       ▼
┌──────────────────────────────────┐
│  SinchConversationsApi.credentials│
└──────┬───────────────────────────┘
       │ 2. Store encrypted credentials
       ▼
┌──────────────────────────────────┐
│  n8n Credentials Store           │
└──────┬───────────────────────────┘
       │ 3. On first request
       ▼
┌──────────────────────────────────┐
│  getAccessToken()                │
│  - Check token cache             │
│  - If expired or missing:        │
└──────┬───────────────────────────┘
       │ 4. POST to auth endpoint
       │    grant_type=client_credentials
       │    Basic Auth (keyId:keySecret)
       ▼
┌──────────────────────────────────┐
│  https://auth.sinch.com          │
│  /oauth2/token                   │
└──────┬───────────────────────────┘
       │ 5. Returns:
       │    {
       │      "access_token": "...",
       │      "expires_in": 3600
       │    }
       ▼
┌──────────────────────────────────┐
│  Token Cache                     │
│  Map<cacheKey, {                 │
│    token: string,                │
│    expiresAt: timestamp          │
│  }>                              │
└──────┬───────────────────────────┘
       │ 6. Use cached token for all requests
       │    for next ~55 minutes
       ▼
┌──────────────────────────────────┐
│  API Requests with               │
│  Authorization: Bearer {token}   │
└──────────────────────────────────┘
```

---

## Send Message Flow

```
┌─────────────┐
│   n8n User  │
│ configures: │
│ - To: "+1..." │
│ - Message   │
│ - Metadata  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────┐
│  SinchConversations.node.ts      │
│  operation: "send"               │
└──────┬───────────────────────────┘
       │ 1. Normalize phone number
       ▼
┌──────────────────────────────────┐
│  normalizePhoneNumberToE164()    │
│  "5551234567" → "+15551234567"   │
└──────┬───────────────────────────┘
       │ 2. Validate
       ▼
┌──────────────────────────────────┐
│  SinchConversationsProvider      │
│  .send()                         │
└──────┬───────────────────────────┘
       │ 3. Build request body:
       │    {
       │      app_id: "...",
       │      recipient: {
       │        identified_by: {
       │          channel_identities: [{
       │            channel: "SMS",
       │            identity: "+15551234567"
       │          }]
       │        }
       │      },
       │      message: {
       │        text_message: { text: "..." }
       │      }
       │    }
       ▼
┌──────────────────────────────────┐
│  makeSinchConversationsRequest() │
└──────┬───────────────────────────┘
       │ 4. Get OAuth2.0 token (cached)
       │ 5. Select regional endpoint
       ▼
┌──────────────────────────────────┐
│  POST https://{region}.          │
│  conversation.api.sinch.com      │
│  /v1/projects/{projectId}/       │
│  messages:send                   │
│                                  │
│  Headers:                        │
│    Authorization: Bearer {token} │
│    Content-Type: application/json│
└──────┬───────────────────────────┘
       │ 6. Response:
       │    {
       │      "message_id": "...",
       │      "accepted_time": "..."
       │    }
       ▼
┌──────────────────────────────────┐
│  n8n Output Item                 │
│  {                               │
│    messageId: "...",             │
│    status: "queued",             │
│    acceptedTime: "...",          │
│    to: "+15551234567",           │
│    channel: "SMS"                │
│  }                               │
└──────────────────────────────────┘
```

---

## List Messages Flow

```
┌─────────────┐
│   n8n User  │
│ configures: │
│ - Filters   │
│ - Date range│
│ - Page size │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────┐
│  SinchConversations.node.ts      │
│  operation: "list"               │
└──────┬───────────────────────────┘
       │ 1. Build query params:
       │    {
       │      app_id: "...",
       │      contact_id: "..." (optional),
       │      start_time: "2024-01-01T00:00:00Z",
       │      end_time: "2024-12-31T23:59:59Z",
       │      page_size: 10,
       │      channel: "SMS"
       │    }
       ▼
┌──────────────────────────────────┐
│  makeSinchConversationsRequest() │
└──────┬───────────────────────────┘
       │ 2. Get OAuth2.0 token (cached)
       │ 3. Select regional endpoint
       ▼
┌──────────────────────────────────┐
│  GET https://{region}.           │
│  conversation.api.sinch.com      │
│  /v1/projects/{projectId}/       │
│  messages?app_id=...&...         │
│                                  │
│  Headers:                        │
│    Authorization: Bearer {token} │
└──────┬───────────────────────────┘
       │ 4. Response:
       │    {
       │      "messages": [
       │        {
       │          "id": "...",
       │          "direction": "TO_CONTACT",
       │          "accept_time": "...",
       │          "channel_identity": {...},
       │          "contact_id": "...",
       │          "conversation_id": "...",
       │          "app_message": {
       │            "text_message": {
       │              "text": "..."
       │            }
       │          }
       │        }
       │      ],
       │      "next_page_token": "..."
       │    }
       ▼
┌──────────────────────────────────┐
│  Parse and Transform             │
│  Each message → n8n output item  │
└──────┬───────────────────────────┘
       │ 5. Return multiple items
       ▼
┌──────────────────────────────────┐
│  n8n Output Items (array)        │
│  [                               │
│    {                             │
│      messageId: "...",           │
│      direction: "TO_CONTACT",    │
│      acceptTime: "...",          │
│      channel: "SMS",             │
│      identity: "+15551234567",   │
│      text: "Hello world",        │
│      contactId: "...",           │
│      conversationId: "..."       │
│    },                            │
│    {...},                        │
│    {...}                         │
│  ]                               │
└──────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────┐
│  Any API Request                │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  makeSinchConversationsRequest()│
└──────┬──────────────────────────┘
       │
       ▼
   ┌───────┐
   │ Success? │────YES────┐
   └───┬───┘             │
       │ NO              │
       ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ HTTP Error   │   │ Return data  │
└──────┬───────┘   └──────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Parse Sinch Error Response      │
│  {                               │
│    "error": {                    │
│      "code": 401,                │
│      "message": "...",           │
│      "status": "UNAUTHENTICATED",│
│      "details": [...]            │
│    }                             │
│  }                               │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  throw SinchApiError             │
│  - message                       │
│  - statusCode                    │
│  - errorCode                     │
│  - details                       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  n8n catches and displays        │
│  error to user with full details │
└──────────────────────────────────┘
```

---

## Token Caching Strategy

```
Time: 00:00 → First Request
│
├─ getAccessToken()
│   └─ Cache is empty
│       └─ POST /oauth2/token
│           └─ Response: { access_token, expires_in: 3600 }
│               └─ Store in cache:
│                   {
│                     token: "abc...",
│                     expiresAt: 00:55 (now + 3600s - 300s buffer)
│                   }
│
Time: 00:05 → Second Request
│
├─ getAccessToken()
│   └─ Cache hit! (expires at 00:55, now is 00:05)
│       └─ Return cached token "abc..."
│
Time: 00:30 → Third Request
│
├─ getAccessToken()
│   └─ Cache hit! (expires at 00:55, now is 00:30)
│       └─ Return cached token "abc..."
│
Time: 00:56 → Fourth Request
│
├─ getAccessToken()
│   └─ Cache expired (now 00:56 > expiresAt 00:55)
│       └─ POST /oauth2/token
│           └─ Response: { access_token, expires_in: 3600 }
│               └─ Update cache:
│                   {
│                     token: "xyz...",
│                     expiresAt: 01:51 (now + 3600s - 300s)
│                   }
│
Time: 01:00 → Fifth Request
│
├─ getAccessToken()
│   └─ Cache hit! (expires at 01:51, now is 01:00)
│       └─ Return cached token "xyz..."
│
... cycle repeats
```

**Key Points:**
- Token cached for ~55 minutes (with 5-minute safety buffer)
- Automatic refresh on expiry
- No rate limit issues from over-fetching
- Cache key: `${keyId}:${keySecret}` (per credential set)

---

## Regional Endpoint Selection

```
┌─────────────────────────────────┐
│  User selects region in creds:  │
│  ● US (default)                 │
│  ○ EU                           │
│  ○ BR                           │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Credentials stored:            │
│  {                              │
│    keyId: "...",                │
│    keySecret: "...",            │
│    region: "us",    ◄──────────│
│    projectId: "...",            │
│    appId: "..."                 │
│  }                              │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  getBaseUrl(credentials.region) │
└──────┬──────────────────────────┘
       │
       ▼
   ┌───────────┐
   │  region?  │
   └───┬───────┘
       │
   ┌───┴───────────────┬───────────────┐
   │                   │               │
   ▼                   ▼               ▼
┌──────┐          ┌──────┐        ┌──────┐
│  us  │          │  eu  │        │  br  │
└──┬───┘          └──┬───┘        └──┬───┘
   │                 │               │
   ▼                 ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ https://us.  │ │ https://eu.  │ │ https://br.  │
│ conversation │ │ conversation │ │ conversation │
│ .api.sinch   │ │ .api.sinch   │ │ .api.sinch   │
│ .com         │ │ .com         │ │ .com         │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Important:** Region must match where the Conversation API app was created!

---

## File Structure & Dependencies

```
n8n-nodes-sinch-conversations/
│
├── src/
│   ├── index.ts ─────────────────────┐
│   │                                  │ Exports nodes & credentials
│   ├── credentials/                   │
│   │   └── SinchConversationsApi.credentials.ts
│   │       ├─ Credential definition   │
│   │       ├─ Field validation        │
│   │       └─ Test endpoint           │
│   │                                  │
│   ├── nodes/                         │
│   │   └── SinchConversations/        │
│   │       ├── SinchConversations.node.ts
│   │       │   ├─ Resource selection  │
│   │       │   ├─ Operation selection │
│   │       │   ├─ Field definitions   │
│   │       │   └─ Execute logic       │
│   │       │                          │
│   │       ├── types.ts               │
│   │       │   ├─ Request types       │
│   │       │   ├─ Response types      │
│   │       │   └─ Provider interfaces │
│   │       │                          │
│   │       └── providers/             │
│   │           ├── ProviderStrategy.ts
│   │           │   └─ Interface       │
│   │           │                      │
│   │           └── SinchConversationsProvider.ts
│   │               ├─ send()          │
│   │               └─ list() (future) │
│   │                                  │
│   └── utils/                         │
│       ├── errors.ts                  │
│       │   ├─ ProviderHttpError       │
│       │   └─ SinchApiError           │
│       │                              │
│       ├── phone.ts                   │
│       │   ├─ normalizePhoneNumberToE164()
│       │   └─ detectEncoding()        │
│       │                              │
│       └── sinchConversationsHttp.ts  │
│           ├─ getAccessToken()        │
│           │   └─ Token caching       │
│           ├─ getBaseUrl()            │
│           │   └─ Regional selection  │
│           └─ makeSinchConversationsRequest()
│               ├─ Auth handling       │
│               ├─ Error parsing       │
│               └─ Request execution   │
│                                      │
├── tests/                             │
│   ├── __mocks__/                     │
│   │   └── n8n-workflow.ts            │
│   │                                  │
│   └── SinchConversations.node.test.ts
│       ├─ Send message tests          │
│       ├─ List messages tests         │
│       ├─ Auth tests                  │
│       └─ Error handling tests        │
│                                      │
└── package.json ─────────────────────┘
    ├─ Dependencies
    ├─ Build scripts
    └─ n8n node registration
```

---

## Data Flow: Complete Request Lifecycle

```
1. USER INPUT (n8n UI)
   │
   │ Resource: message
   │ Operation: send
   │ To: "5551234567"
   │ Message: "Hello!"
   │ Country: US
   │
   ▼
2. NODE PARAMETER EXTRACTION
   │
   │ this.getNodeParameter('to', 0)
   │ → "5551234567"
   │
   ▼
3. PHONE NORMALIZATION
   │
   │ normalizePhoneNumberToE164("5551234567", "US")
   │ → { ok: true, value: "+15551234567" }
   │
   ▼
4. PROVIDER CALL
   │
   │ provider.send({
   │   to: "+15551234567",
   │   message: "Hello!",
   │   credentials: {...}
   │ })
   │
   ▼
5. REQUEST BODY CONSTRUCTION
   │
   │ {
   │   app_id: "01ABC...",
   │   recipient: {
   │     identified_by: {
   │       channel_identities: [{
   │         channel: "SMS",
   │         identity: "+15551234567"
   │       }]
   │     }
   │   },
   │   message: {
   │     text_message: { text: "Hello!" }
   │   },
   │   channel_priority_order: ["SMS"]
   │ }
   │
   ▼
6. HTTP REQUEST HELPER
   │
   │ makeSinchConversationsRequest({
   │   method: "POST",
   │   endpoint: "/v1/projects/{id}/messages:send",
   │   body: {...}
   │ })
   │
   ▼
7. AUTH TOKEN FETCH (if needed)
   │
   │ getAccessToken() →
   │   Check cache → miss
   │   POST https://auth.sinch.com/oauth2/token
   │   → { access_token: "...", expires_in: 3600 }
   │   Store in cache
   │
   ▼
8. REGIONAL ENDPOINT
   │
   │ getBaseUrl("us")
   │ → "https://us.conversation.api.sinch.com"
   │
   ▼
9. HTTP REQUEST
   │
   │ POST https://us.conversation.api.sinch.com
   │      /v1/projects/{projectId}/messages:send
   │ Headers:
   │   Authorization: Bearer {token}
   │   Content-Type: application/json
   │ Body: { app_id, recipient, message, ... }
   │
   ▼
10. SINCH API PROCESSING
   │
   │ Validate request
   │ Enqueue message
   │ Return response
   │
   ▼
11. API RESPONSE
   │
   │ {
   │   "message_id": "01GH2...",
   │   "accepted_time": "2024-11-06T10:30:00Z"
   │ }
   │
   ▼
12. PROVIDER RESULT
   │
   │ {
   │   status: "queued",
   │   messageId: "01GH2...",
   │   acceptedTime: "2024-11-06T10:30:00Z",
   │   raw: {...}
   │ }
   │
   ▼
13. N8N OUTPUT ITEM
   │
   │ {
   │   messageId: "01GH2...",
   │   status: "queued",
   │   acceptedTime: "2024-11-06T10:30:00Z",
   │   to: "+15551234567",
   │   message: "Hello!",
   │   provider: "Sinch Build Conversations",
   │   channel: "SMS"
   │ }
   │
   ▼
14. N8N WORKFLOW
   │
   │ Pass to next node or display result
```

---

## Testing Architecture

```
┌─────────────────────────────────┐
│  Vitest Test Suite              │
└──────┬──────────────────────────┘
       │
       ├── Unit Tests
       │   │
       │   ├── Credentials
       │   │   └─ Field validation
       │   │
       │   ├── Phone Normalization
       │   │   ├─ E.164 formatting
       │   │   ├─ Country detection
       │   │   └─ Error cases
       │   │
       │   ├── OAuth2.0 Token
       │   │   ├─ Token fetch
       │   │   ├─ Token caching
       │   │   └─ Token expiry
       │   │
       │   └── Error Handling
       │       ├─ API errors
       │       └─ Network errors
       │
       └── Integration Tests
           │
           ├── Send Message
           │   ├─ Mock HTTP request
           │   ├─ Mock OAuth2.0 token
           │   ├─ Verify request body
           │   └─ Check response parsing
           │
           └── List Messages
               ├─ Mock HTTP request
               ├─ Mock OAuth2.0 token
               ├─ Verify query params
               └─ Check response parsing

┌─────────────────────────────────┐
│  Mock Objects                   │
└──────┬──────────────────────────┘
       │
       ├── n8n-workflow mocks
       │   ├─ IExecuteFunctions
       │   ├─ INodeExecutionData
       │   └─ helpers.httpRequest
       │
       ├── Nock HTTP mocks
       │   ├─ auth.sinch.com/oauth2/token
       │   └─ *.conversation.api.sinch.com
       │
       └── Credential mocks
           └─ Complete credential set
```

---

## Comparison: n8n-engage vs n8n-conversations

```
┌───────────────────────────────────────────────────────────────┐
│                    n8n-engage                                 │
│               (MessageMedia API)                              │
└───────────────────────────────────────────────────────────────┘
        │
        │  Request Format:
        │  {
        │    messages: [
        │      {
        │        content: "Hello",
        │        destination_number: "+1234",
        │        source_number: "+5678"  (optional)
        │      }
        │    ]
        │  }
        │
        │  Auth: Basic (apiKey:apiSecret)
        │  Endpoint: https://api.messagemedia.com/v1/messages
        │
        ▼

┌───────────────────────────────────────────────────────────────┐
│               n8n-conversations                               │
│            (Sinch Build Conversations API)                          │
└───────────────────────────────────────────────────────────────┘
        │
        │  Request Format:
        │  {
        │    app_id: "01ABC...",
        │    recipient: {
        │      identified_by: {
        │        channel_identities: [{
        │          channel: "SMS",
        │          identity: "+1234"
        │        }]
        │      }
        │    },
        │    message: {
        │      text_message: { text: "Hello" }
        │    },
        │    channel_priority_order: ["SMS"]
        │  }
        │
        │  Auth: OAuth2.0 Bearer Token (preferred) OR Basic
        │  Endpoint: https://{region}.conversation.api.sinch.com
        │            /v1/projects/{projectId}/messages:send
        │
        ▼
```

---

**End of Architecture Documentation**
