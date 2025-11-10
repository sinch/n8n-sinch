# Sinch Build Conversations API n8n Connector - Build Plan

## Executive Summary

This document outlines a detailed plan to build an n8n community node for the **Sinch Build Conversations API**, based on the proven patterns and architecture from our `n8n-engage` connector. The initial version will support **Send Message** (SMS channel) and optionally **List Messages** actions.

## Reference Implementation

We're following the architecture established in `/n8n/n8n-engage`:
- Clean TypeScript implementation with strong typing
- Modular provider pattern for API interactions
- Comprehensive credential management with OAuth2.0 and Basic Auth
- Robust error handling and phone number normalization utilities
- Full testing suite with mocks
- Professional deployment process with alpha/beta/GA versioning

## Project Overview

### API Documentation Reference
- **Base Documentation**: https://developers.sinch.com/docs/conversation/api-reference/conversation/messages/messages_sendmessage
- **API Type**: REST API with OAuth2.0 (recommended) or Basic Authentication
- **Base URLs** (Regional):
  - US: `https://us.conversation.api.sinch.com`
  - EU: `https://eu.conversation.api.sinch.com`
  - BR: `https://br.conversation.api.sinch.com`

### Core Differences from MessageMedia API

| Feature                 | Sinch Build Conversations                       | MessageMedia (n8n-engage)      |
| ----------------------- | ----------------------------------------- | ------------------------------ |
| **Authentication**      | OAuth2.0 (preferred) + Basic Auth         | Basic Auth only                |
| **Regional Endpoints**  | Yes (US/EU/BR)                            | No                             |
| **App ID Required**     | Yes (per project)                         | No                             |
| **Project ID Required** | Yes                                       | No                             |
| **Recipient Format**    | Object-based with channel identities      | Simple phone number string     |
| **Message Structure**   | Nested message types (text_message, etc.) | Flat messages array            |
| **Response Format**     | `message_id` + `accepted_time`            | Messages array with message_id |

---

## Phase 1: Project Structure & Setup

### Directory Structure

```
n8n/n8n-build/
└── n8n-nodes-sinch-build-conversations/
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    ├── CHANGELOG.md
    ├── DEPLOYMENT.md
    ├── LICENSE
    ├── .gitignore
    ├── vitest.config.ts
    ├── deploy/
    │   ├── deploy-to-npm.sh
    │   └── unpublish-dev-package.sh
    ├── src/
    │   ├── index.ts
    │   ├── credentials/
    │   │   └── SinchBuildConversationsApi.credentials.ts
    │   ├── nodes/
    │   │   └── SinchBuildConversations/
    │   │       ├── SinchBuildConversations.node.ts
    │   │       ├── types.ts
    │   │       ├── sinch-logo.png
    │   │       └── providers/
    │   │           ├── ProviderStrategy.ts
    │   │           └── SinchBuildConversationsProvider.ts
    │   └── utils/
    │       ├── errors.ts
    │       ├── phone.ts
    │       └── SinchBuildConversationsHttp.ts
    ├── tests/
    │   ├── __mocks__/
    │   │   └── n8n-workflow.ts
    │   └── SinchBuildConversations.node.test.ts
    └── examples/
        └── basic-sms-workflow.json
```

### File: `package.json`

```json
{
  "name": "@sinch-engage/n8n-nodes-sinch-build-conversations",
  "version": "1.0.0-alpha-0",
  "description": "n8n community node for Sinch Build Conversations API - send and manage omnichannel messages",
  "keywords": [
    "n8n-community-node",
    "n8n-nodes",
    "sinch",
    "conversations",
    "sms",
    "whatsapp",
    "messaging",
    "omnichannel"
  ],
  "license": "MIT",
  "author": "Sinch Engage",
  "type": "commonjs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "n8n": {
    "nodes": [
      "dist/nodes/SinchBuildConversations/SinchBuildConversations.node.js"
    ],
    "credentials": [
      "dist/credentials/SinchBuildConversationsApi.credentials.js"
    ]
  },
  "directories": {
    "example": "examples",
    "test": "tests"
  },
  "files": [
    "dist/**/*",
    "src/**/*",
    "tests/**/*",
    "examples/**/*",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json && npm run copy:icons",
    "copy:icons": "mkdir -p dist/nodes/SinchBuildConversations && cp -f src/nodes/SinchBuildConversations/*.png src/nodes/SinchBuildConversations/*.svg dist/nodes/SinchBuildConversations/ 2>/dev/null || true",
    "lint": "eslint \"src/**/*.{ts,tsx}\" --max-warnings=0",
    "lint:fix": "eslint \"src/**/*.{ts,tsx}\" --max-warnings=0 --fix",
    "test": "vitest run",
    "dev:test": "vitest",
    "prepare": "npm run build"
  },
  "dependencies": {
    "google-libphonenumber": "^3.2.43"
  },
  "devDependencies": {
    "@types/node": "^20.14.9",
    "@typescript-eslint/eslint-plugin": "^7.16.0",
    "@typescript-eslint/parser": "^7.16.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "n8n-core": "^1.0.0",
    "n8n-workflow": "^1.0.0",
    "nock": "^13.4.0",
    "node-fetch": "^2.6.9",
    "prettier": "^3.3.3",
    "typescript": "^5.5.3",
    "vitest": "^1.6.0"
  },
  "peerDependencies": {
    "n8n-core": ">=1.0.0",
    "n8n-workflow": ">=1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Phase 2: Credentials Implementation

### File: `src/credentials/SinchBuildConversationsApi.credentials.ts`

**Key Features:**
- OAuth2.0 authentication (preferred)
- Basic authentication (fallback/testing)
- Region selection (US/EU/BR)
- Project ID and App ID fields
- Credential testing

```typescript
import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  ICredentialDataDecryptedObject,
} from 'n8n-workflow';

export class SinchBuildConversationsApi implements ICredentialType {
  name = 'SinchBuildConversationsApi';
  displayName = 'Sinch Build Conversations API';
  documentationUrl = 'https://developers.sinch.com/docs/conversation/';
  
  properties: INodeProperties[] = [
    {
      displayName: 'Authentication Method',
      name: 'authMethod',
      type: 'options',
      options: [
        {
          name: 'OAuth2.0 (Recommended)',
          value: 'oauth2',
          description: 'Production-ready authentication with access tokens',
        },
        {
          name: 'Basic Authentication',
          value: 'basic',
          description: 'Simple auth for testing (rate limited)',
        },
      ],
      default: 'oauth2',
    },
    // OAuth2.0 Fields
    {
      displayName: 'Key ID (Client ID)',
      name: 'keyId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Sinch API Key ID from the dashboard',
    },
    {
      displayName: 'Key Secret (Client Secret)',
      name: 'keySecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Sinch API Key Secret from the dashboard',
    },
    // Region Selection
    {
      displayName: 'Region',
      name: 'region',
      type: 'options',
      options: [
        { name: 'US', value: 'us' },
        { name: 'EU', value: 'eu' },
        { name: 'BR', value: 'br' },
      ],
      default: 'us',
      required: true,
      description: 'Region where your Conversation API app was created',
    },
    // Project ID
    {
      displayName: 'Project ID',
      name: 'projectId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Sinch Project ID from the dashboard',
      placeholder: 'e.g., 00000000-0000-0000-0000-000000000000',
    },
    // App ID (used in messages)
    {
      displayName: 'App ID',
      name: 'appId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Sinch Conversation API App ID',
      placeholder: 'e.g., 01AAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  ];

  // OAuth2.0 authentication is handled dynamically in the HTTP helper
  // No static authenticate block needed since we fetch tokens at runtime

  // Test the credentials
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.region ? `https://${$credentials.region}.conversation.api.sinch.com` : "https://us.conversation.api.sinch.com"}}',
      url: '/v1/projects/={{$credentials.projectId}}/apps/={{$credentials.appId}}',
      method: 'GET',
    },
  };
}
```

**Authentication Flow:**
1. User provides Key ID and Key Secret
2. At request time, we fetch OAuth2.0 access token from `https://auth.sinch.com/oauth2/token`
3. Cache token for 1 hour (expires_in from response)
4. Use Bearer token in Authorization header for API requests

---

## Phase 3: Core Types & Utilities

### File: `src/nodes/SinchBuildConversations/types.ts`

```typescript
import type { IExecuteFunctions } from 'n8n-workflow';

export type SinchRegion = 'us' | 'eu' | 'br';
export type SinchChannel = 'SMS' | 'WHATSAPP' | 'RCS' | 'MESSENGER' | 'VIBERBM';
export type MessageStatus = 'queued' | 'sent' | 'failed';

// Credentials structure
export interface SinchBuildConversationsCredentials {
  authMethod: 'oauth2' | 'basic';
  keyId: string;
  keySecret: string;
  region: SinchRegion;
  projectId: string;
  appId: string;
}

// OAuth2 token response
export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Send message request structure (to Sinch API)
export interface SendMessageRequest {
  app_id: string;
  recipient: {
    identified_by?: {
      channel_identities: Array<{
        channel: SinchChannel;
        identity: string;
      }>;
    };
    contact_id?: string;
  };
  message: {
    text_message?: {
      text: string;
    };
  };
  channel_priority_order?: SinchChannel[];
  callback_url?: string;
  message_metadata?: string;
}

// Send message response (from Sinch API)
export interface SendMessageResponse {
  message_id: string;
  accepted_time: string; // ISO 8601
}

// List messages query parameters
export interface ListMessagesParams {
  app_id?: string;
  contact_id?: string;
  conversation_id?: string;
  start_time?: string; // ISO 8601
  end_time?: string; // ISO 8601
  page_size?: number;
  page_token?: string;
  channel?: SinchChannel;
}

// List messages response
export interface ListMessagesResponse {
  messages: ConversationMessage[];
  next_page_token?: string;
}

export interface ConversationMessage {
  id: string;
  direction: 'TO_CONTACT' | 'TO_APP';
  accept_time: string;
  channel_identity: {
    channel: SinchChannel;
    identity: string;
    app_id: string;
  };
  contact_id: string;
  conversation_id: string;
  app_message?: {
    text_message?: {
      text: string;
    };
  };
  metadata?: string;
}

// Provider send parameters
export interface ProviderSendParams {
  to: string; // Phone number in E.164 format
  message: string;
  from?: string; // Optional sender identifier
  callbackUrl?: string;
  metadata?: string;
  helpers: IExecuteFunctions['helpers'];
  credentials: SinchBuildConversationsCredentials;
}

// Provider send result
export interface ProviderSendResult {
  status: MessageStatus;
  messageId?: string;
  acceptedTime?: string;
  raw?: unknown;
  error?: string;
}
```

### File: `src/utils/errors.ts`

```typescript
export class ProviderHttpError extends Error {
  statusCode?: number;
  response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'ProviderHttpError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class SinchApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  details?: unknown;

  constructor(message: string, statusCode?: number, errorCode?: string, details?: unknown) {
    super(message);
    this.name = 'SinchApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}
```

### File: `src/utils/phone.ts`

**Reuse from n8n-engage:**
```typescript
// Copy the phone number normalization utilities from n8n-engage
// Located at: n8n/n8n-engage/src/utils/phone.ts
//
// Key functions:
// - normalizePhoneNumberToE164(phoneNumber: string, defaultCountry?: string)
// - detectEncoding(message: string, encoding?: 'auto' | 'GSM7' | 'UCS-2')
//
// These utilities handle:
// - E.164 phone number formatting
// - Country code validation
// - GSM7 vs UCS-2 encoding detection for SMS
```

---

## Phase 4: HTTP Request Helper

### File: `src/utils/SinchBuildConversationsHttp.ts`

**Key Features:**
- OAuth2.0 token management with caching
- Regional endpoint handling
- Automatic token refresh
- Error handling with detailed Sinch API errors

```typescript
import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import type { SinchBuildConversationsCredentials, OAuth2TokenResponse, SinchRegion } from '../nodes/SinchBuildConversations/types';
import { SinchApiError } from './errors';

// Token cache (in-memory, keyed by credentials)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Get OAuth2.0 access token for Sinch Build Conversations API.
 * Caches tokens until they expire (typically 1 hour).
 */
async function getAccessToken(
  context: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  credentials: SinchBuildConversationsCredentials,
): Promise<string> {
  // Check if using basic auth (return empty, will use basic auth header instead)
  if (credentials.authMethod === 'basic') {
    return '';
  }

  // Create cache key
  const cacheKey = `${credentials.keyId}:${credentials.keySecret}`;
  const cached = tokenCache.get(cacheKey);

  // Return cached token if still valid (with 5-minute buffer)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  // Fetch new token from Sinch auth server
  const http = (context.helpers as any).httpRequest ?? (context.helpers as any).request;

  try {
    const response = await http({
      method: 'POST',
      url: 'https://auth.sinch.com/oauth2/token',
      form: {
        grant_type: 'client_credentials',
      },
      auth: {
        username: credentials.keyId,
        password: credentials.keySecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      json: true,
    }) as OAuth2TokenResponse;

    // Cache the token
    const expiresAt = Date.now() + (response.expires_in * 1000);
    tokenCache.set(cacheKey, {
      token: response.access_token,
      expiresAt,
    });

    return response.access_token;
  } catch (error: any) {
    throw new SinchApiError(
      `Failed to obtain OAuth2 access token: ${error.message}`,
      error.statusCode,
      'AUTH_FAILED',
      error.response,
    );
  }
}

/**
 * Get the base URL for the Sinch Build Conversations API based on region.
 */
function getBaseUrl(region: SinchRegion): string {
  const baseUrls: Record<SinchRegion, string> = {
    us: 'https://us.conversation.api.sinch.com',
    eu: 'https://eu.conversation.api.sinch.com',
    br: 'https://br.conversation.api.sinch.com',
  };
  return baseUrls[region] || baseUrls.us;
}

/**
 * Make an authenticated request to the Sinch Build Conversations API.
 * Handles OAuth2.0 token management and regional endpoints.
 */
export async function makeSinchBuildConversationsRequest<T = any>(
  context: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  options: {
    method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
    endpoint: string; // e.g., '/v1/projects/{project_id}/messages:send'
    body?: any;
    qs?: Record<string, any>;
  },
): Promise<T> {
  // Get credentials
  const credentials = (await context.getCredentials('SinchBuildConversationsApi')) as SinchBuildConversationsCredentials;

  // Get access token (empty for basic auth)
  const accessToken = await getAccessToken(context, credentials);

  // Build full URL
  const baseUrl = getBaseUrl(credentials.region);
  const url = `${baseUrl}${options.endpoint}`;

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add authentication
  if (credentials.authMethod === 'oauth2' && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Make request
  const http = (context.helpers as any).httpRequest ?? (context.helpers as any).request;

  try {
    const response = await http({
      method: options.method,
      url,
      uri: url, // backward compat
      json: true,
      body: options.body,
      qs: options.qs,
      headers,
      auth: credentials.authMethod === 'basic' ? {
        username: credentials.keyId,
        password: credentials.keySecret,
      } : undefined,
      timeout: 30000, // 30s timeout for Conversations API
    });

    return response as T;
  } catch (error: any) {
    // Parse Sinch API error format
    const errorResponse = error.response?.body || error.error || error;
    const errorCode = errorResponse?.error?.code || error.statusCode;
    const errorMessage = errorResponse?.error?.message || error.message || 'Unknown error';
    const errorStatus = errorResponse?.error?.status;

    throw new SinchApiError(
      `Sinch Build Conversations API error: ${errorMessage}`,
      errorCode,
      errorStatus,
      errorResponse,
    );
  }
}
```

---

## Phase 5: Provider Implementation

### File: `src/nodes/SinchBuildConversations/providers/ProviderStrategy.ts`

```typescript
import type { ProviderSendParams, ProviderSendResult } from '../types';

export interface ProviderStrategy {
  send(params: ProviderSendParams): Promise<ProviderSendResult>;
}
```

### File: `src/nodes/SinchBuildConversations/providers/SinchBuildConversationsProvider.ts`

```typescript
import type { IExecuteFunctions } from 'n8n-workflow';
import { ProviderStrategy } from './ProviderStrategy';
import { ProviderHttpError } from '../../../utils/errors';
import { makeSinchBuildConversationsRequest } from '../../../utils/SinchBuildConversationsHttp';
import type {
  SinchBuildConversationsCredentials,
  SendMessageRequest,
  SendMessageResponse,
  ProviderSendParams,
  ProviderSendResult,
} from '../types';

export class SinchBuildConversationsProvider implements ProviderStrategy {
  async send(params: ProviderSendParams): Promise<ProviderSendResult> {
    const { to, message, callbackUrl, metadata, helpers, credentials } = params;

    // Build request payload
    const requestBody: SendMessageRequest = {
      app_id: credentials.appId,
      recipient: {
        identified_by: {
          channel_identities: [
            {
              channel: 'SMS',
              identity: to, // E.164 phone number
            },
          ],
        },
      },
      message: {
        text_message: {
          text: message,
        },
      },
      channel_priority_order: ['SMS'],
    };

    // Add optional fields
    if (callbackUrl) {
      requestBody.callback_url = callbackUrl;
    }
    if (metadata) {
      requestBody.message_metadata = metadata;
    }

    // Build endpoint URL
    const endpoint = `/v1/projects/${credentials.projectId}/messages:send`;

    try {
      // Cast helpers to provide context for shared utility
      const context = { helpers, getCredentials: async () => credentials } as any;

      const response = await makeSinchBuildConversationsRequest<SendMessageResponse>(context, {
        method: 'POST',
        endpoint,
        body: requestBody,
      });

      return {
        status: 'queued',
        messageId: response.message_id,
        acceptedTime: response.accepted_time,
        raw: response,
      };
    } catch (err) {
      const error = err as { statusCode?: number; message?: string; response?: unknown };
      throw new ProviderHttpError(
        error.message || 'Sinch Build Conversations API request failed',
        error.statusCode,
        error.response,
      );
    }
  }
}
```

---

## Phase 6: Main Node Implementation

### File: `src/nodes/SinchBuildConversations/SinchBuildConversations.node.ts`

**Key Features:**
- Resource-based structure (SMS, potentially others)
- Operation selection (Send, List)
- Phone number normalization integration
- Optional metadata and callback URL support
- Regional endpoint handling via credentials

```typescript
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
  IDataObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { normalizePhoneNumberToE164 } from '../../utils/phone';
import { SinchBuildConversationsProvider } from './providers/SinchBuildConversationsProvider';
import { makeSinchBuildConversationsRequest } from '../../utils/SinchBuildConversationsHttp';
import type { SinchBuildConversationsCredentials, ListMessagesResponse, ListMessagesParams } from './types';
import * as countries from 'i18n-iso-countries';
import enLocale = require('i18n-iso-countries/langs/en.json');

// Register English locale for country names
countries.registerLocale(enLocale);

// Generate country list for dropdown (sorted alphabetically by name)
function getCountryOptions() {
  const countryList = countries.getNames('en', { select: 'official' });
  return Object.entries(countryList)
    .map(([code, name]) => ({
      name: `${name} (${code})`,
      value: code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export class SinchBuildConversations implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sinch Build Conversations',
    name: 'SinchBuildConversations',
    icon: 'file:sinch-logo.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Send and manage omnichannel messages via Sinch Build Conversations API',
    defaults: {
      name: 'Sinch Build Conversations',
    },
    inputs: ['main' as NodeConnectionType],
    outputs: ['main' as NodeConnectionType],
    credentials: [
      { name: 'SinchBuildConversationsApi', required: true },
    ],
    properties: [
      // RESOURCE SELECTION
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Message',
            value: 'message',
            description: 'Send and manage messages',
          },
        ],
        default: 'message',
      },

      // OPERATION SELECTION
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['message'],
          },
        },
        options: [
          {
            name: 'Send',
            value: 'send',
            description: 'Send an SMS message via Conversations API',
            action: 'Send a message',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List messages from conversations',
            action: 'List messages',
          },
        ],
        default: 'send',
      },

      // SEND MESSAGE FIELDS
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        required: true,
        default: '',
        description: 'Recipient phone number in E.164 format (e.g., +15551234567)',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['send'],
          },
        },
      },
      {
        displayName: 'Country',
        name: 'defaultCountry',
        type: 'options',
        options: getCountryOptions(),
        default: '',
        required: false,
        description: 'Country for parsing local phone numbers without international prefix',
        placeholder: 'Select a country...',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['send'],
          },
        },
      },
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        typeOptions: { rows: 3 },
        required: true,
        default: '',
        description: 'Message text to send (up to 1600 characters for SMS)',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['send'],
          },
        },
      },

      // SEND MESSAGE ADDITIONAL FIELDS
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['send'],
          },
        },
        options: [
          {
            displayName: 'Callback URL',
            name: 'callbackUrl',
            type: 'string',
            default: '',
            description: 'Webhook URL for delivery status updates',
          },
          {
            displayName: 'Metadata',
            name: 'metadata',
            type: 'string',
            default: '',
            description: 'Custom metadata to associate with the message (up to 1024 characters)',
          },
        ],
      },

      // LIST MESSAGES FIELDS
      {
        displayName: 'Filters',
        name: 'filters',
        type: 'collection',
        placeholder: 'Add Filter',
        default: {},
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['list'],
          },
        },
        options: [
          {
            displayName: 'Contact ID',
            name: 'contactId',
            type: 'string',
            default: '',
            description: 'Filter by contact ID',
          },
          {
            displayName: 'Conversation ID',
            name: 'conversationId',
            type: 'string',
            default: '',
            description: 'Filter by conversation ID',
          },
          {
            displayName: 'Start Time',
            name: 'startTime',
            type: 'dateTime',
            default: '',
            description: 'Filter messages after this timestamp',
          },
          {
            displayName: 'End Time',
            name: 'endTime',
            type: 'dateTime',
            default: '',
            description: 'Filter messages before this timestamp',
          },
          {
            displayName: 'Page Size',
            name: 'pageSize',
            type: 'number',
            default: 10,
            description: 'Number of messages to return (max 1000)',
            typeOptions: {
              minValue: 1,
              maxValue: 1000,
            },
          },
          {
            displayName: 'Channel',
            name: 'channel',
            type: 'options',
            options: [
              { name: 'SMS', value: 'SMS' },
              { name: 'WhatsApp', value: 'WHATSAPP' },
              { name: 'RCS', value: 'RCS' },
            ],
            default: 'SMS',
            description: 'Filter by channel',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = (await this.getCredentials('SinchBuildConversationsApi')) as SinchBuildConversationsCredentials;

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const resource = this.getNodeParameter('resource', itemIndex) as string;
      const operation = this.getNodeParameter('operation', itemIndex) as string;

      if (resource === 'message') {
        if (operation === 'send') {
          // SEND MESSAGE OPERATION
          const toRaw = this.getNodeParameter('to', itemIndex) as string;
          const defaultCountry = this.getNodeParameter('defaultCountry', itemIndex, '') as string || undefined;
          const message = this.getNodeParameter('message', itemIndex) as string;

          const additional = this.getNodeParameter('additionalFields', itemIndex, {}) as {
            callbackUrl?: string;
            metadata?: string;
          };

          // Validate message length
          if (message.length === 0 || message.length > 1600) {
            throw new NodeApiError(this.getNode(), {
              message: 'Message must be between 1 and 1600 characters',
            });
          }

          // Normalize phone number to E.164
          const toResult = normalizePhoneNumberToE164(toRaw, defaultCountry);
          if (!toResult.ok) {
            throw new NodeApiError(this.getNode(), {
              message: `Invalid phone number: ${toResult.error}`,
            });
          }

          const provider = new SinchBuildConversationsProvider();

          try {
            const providerResult = await provider.send({
              to: toResult.value,
              message,
              callbackUrl: additional.callbackUrl,
              metadata: additional.metadata,
              helpers: this.helpers,
              credentials,
            });

            returnData.push({
              json: {
                messageId: providerResult.messageId,
                status: providerResult.status,
                acceptedTime: providerResult.acceptedTime,
                to: toResult.value,
                message,
                provider: 'Sinch Build Conversations',
                channel: 'SMS',
                raw: providerResult.raw,
              } as unknown as IDataObject,
            });
          } catch (error) {
            const e = error as Error;
            throw new NodeApiError(this.getNode(), { message: e.message });
          }
        } else if (operation === 'list') {
          // LIST MESSAGES OPERATION
          const filters = this.getNodeParameter('filters', itemIndex, {}) as {
            contactId?: string;
            conversationId?: string;
            startTime?: string;
            endTime?: string;
            pageSize?: number;
            channel?: string;
          };

          // Build query parameters
          const queryParams: ListMessagesParams = {
            app_id: credentials.appId,
          };

          if (filters.contactId) queryParams.contact_id = filters.contactId;
          if (filters.conversationId) queryParams.conversation_id = filters.conversationId;
          if (filters.startTime) queryParams.start_time = new Date(filters.startTime).toISOString();
          if (filters.endTime) queryParams.end_time = new Date(filters.endTime).toISOString();
          if (filters.pageSize) queryParams.page_size = filters.pageSize;
          if (filters.channel) queryParams.channel = filters.channel as any;

          const endpoint = `/v1/projects/${credentials.projectId}/messages`;

          try {
            const response = await makeSinchBuildConversationsRequest<ListMessagesResponse>(this, {
              method: 'GET',
              endpoint,
              qs: queryParams,
            });

            // Return each message as a separate item
            for (const msg of response.messages) {
              returnData.push({
                json: {
                  messageId: msg.id,
                  direction: msg.direction,
                  acceptTime: msg.accept_time,
                  channel: msg.channel_identity.channel,
                  identity: msg.channel_identity.identity,
                  contactId: msg.contact_id,
                  conversationId: msg.conversation_id,
                  text: msg.app_message?.text_message?.text || '',
                  metadata: msg.metadata,
                } as unknown as IDataObject,
              });
            }
          } catch (error) {
            const e = error as Error;
            throw new NodeApiError(this.getNode(), { message: e.message });
          }
        }
      }
    }

    return [returnData];
  }
}
```

---

## Phase 7: Testing Strategy

### File: `tests/SinchBuildConversations.node.test.ts`

**Test Coverage:**
1. **Send Message Tests**
   - Valid SMS send with E.164 number
   - Phone number normalization
   - Invalid phone number handling
   - Message length validation
   - Optional callback URL and metadata
   - OAuth2.0 token fetching and caching
   - Regional endpoint selection

2. **List Messages Tests**
   - Basic listing with app_id
   - Filtering by contact_id
   - Filtering by date range
   - Pagination support

3. **Authentication Tests**
   - OAuth2.0 token fetch
   - Token caching behavior
   - Basic auth fallback

4. **Error Handling Tests**
   - API errors (401, 403, 404, 500)
   - Network failures
   - Invalid credentials

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SinchBuildConversations } from '../src/nodes/SinchBuildConversations/SinchBuildConversations.node';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

// Mock implementation here
// Follow pattern from n8n/n8n-engage/tests/sms-sender.node.test.ts
```

---

## Phase 8: Documentation

### File: `README.md`

**Sections:**
1. **Overview** - What the connector does
2. **Features** - Key capabilities
3. **Installation** - NPM install instructions
4. **Prerequisites** - Sinch account setup
5. **Credentials Setup** - Step-by-step guide with screenshots
6. **Operations**
   - Send Message (with examples)
   - List Messages (with examples)
7. **Phone Number Format** - E.164 requirements
8. **Authentication** - OAuth2.0 vs Basic Auth
9. **Regional Endpoints** - US/EU/BR selection
10. **Error Handling** - Common issues and solutions
11. **Examples** - Workflow JSON examples
12. **API Rate Limits** - Sinch API limitations
13. **Support** - Links and resources

### File: `CHANGELOG.md`

```markdown
# Changelog

## [1.0.0-alpha-0] - 2024-11-06

### Added
- Initial alpha release
- Send SMS message via Conversations API
- List messages with filtering
- OAuth2.0 authentication support
- Basic authentication support
- Regional endpoint selection (US/EU/BR)
- Phone number normalization to E.164
- Custom callback URL support
- Message metadata support
- Comprehensive error handling

### Known Limitations
- Only SMS channel supported (WhatsApp, RCS coming soon)
- No MMS support in initial release
- List messages pagination requires manual handling
```

### File: `DEPLOYMENT.md`

**Copy from n8n-engage and adapt:**
- Update package name references
- Update scope to `@sinch-engage/n8n-nodes-sinch-build-conversations`
- Keep alpha versioning strategy
- Update testing instructions for Conversations API

---

## Phase 9: Build & Deployment Setup

### File: `deploy/deploy-to-npm.sh`

**Copy from n8n-engage:**
```bash
#!/bin/bash
# Deploy to NPM with safety checks
# Adapted for Sinch Build Conversations connector
```

### File: `deploy/unpublish-dev-package.sh`

**Copy from n8n-engage:**
```bash
#!/bin/bash
# Unpublish development versions safely
```

### File: `.gitignore`

```
# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local

# Testing
coverage/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# NPM
npm-debug.log*
.npm
```

---

## Phase 10: Implementation Checklist

### Week 1: Foundation
- [ ] Create project structure in `n8n/n8n-build/n8n-nodes-sinch-build-conversations/`
- [ ] Set up `package.json` with dependencies
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Set up testing framework (vitest)
- [ ] Implement credential types with OAuth2.0 support
- [ ] Create utility files (errors, phone, HTTP helper)

### Week 2: Core Implementation
- [ ] Implement OAuth2.0 token management with caching
- [ ] Build `SinchBuildConversationsProvider` for Send Message
- [ ] Implement main node with Send Message operation
- [ ] Add phone number normalization integration
- [ ] Test Send Message with sandbox/test numbers

### Week 3: List Messages & Testing
- [ ] Implement List Messages operation
- [ ] Add filtering and pagination support
- [ ] Write comprehensive unit tests
- [ ] Create example workflows
- [ ] Test with real Sinch Build Conversations API credentials

### Week 4: Documentation & Deployment
- [ ] Write README.md with setup guide
- [ ] Create CHANGELOG.md
- [ ] Write DEPLOYMENT.md
- [ ] Test local installation in n8n
- [ ] Deploy alpha version to NPM (`1.0.0-alpha-0`)
- [ ] Verify n8n community node installation

### Week 5: Beta Testing & Refinement
- [ ] Collect feedback from internal testing
- [ ] Fix bugs and improve error messages
- [ ] Optimize token caching behavior
- [ ] Add additional message metadata options
- [ ] Deploy beta version (`1.0.0-beta-0`)

---

## API Integration Details

### Send Message Flow

1. **User Input**
   - Phone number (raw format)
   - Message text
   - Optional: callback URL, metadata

2. **Phone Normalization**
   - Convert to E.164 format using `google-libphonenumber`
   - Validate country code
   - Throw error if invalid

3. **OAuth2.0 Token Fetch** (if not cached)
   - POST to `https://auth.sinch.com/oauth2/token`
   - Body: `grant_type=client_credentials`
   - Auth: Basic (keyId:keySecret)
   - Cache token for ~55 minutes (5-minute buffer)

4. **Send Message Request**
   - POST to `https://{region}.conversation.api.sinch.com/v1/projects/{projectId}/messages:send`
   - Headers: `Authorization: Bearer {accessToken}`
   - Body:
     ```json
     {
       "app_id": "{appId}",
       "recipient": {
         "identified_by": {
           "channel_identities": [
             {
               "channel": "SMS",
               "identity": "+15551234567"
             }
           ]
         }
       },
       "message": {
         "text_message": {
           "text": "Hello from n8n!"
         }
       },
       "channel_priority_order": ["SMS"],
       "callback_url": "https://webhook.site/...",
       "message_metadata": "custom-id-123"
     }
     ```

5. **Response Handling**
   - Success: Extract `message_id` and `accepted_time`
   - Error: Parse Sinch error format and throw `SinchApiError`

### List Messages Flow

1. **User Input**
   - Filters: contact_id, conversation_id, date range, channel
   - Page size (default: 10, max: 1000)

2. **OAuth2.0 Token** (same as above)

3. **List Messages Request**
   - GET to `https://{region}.conversation.api.sinch.com/v1/projects/{projectId}/messages`
   - Query params: `app_id`, `contact_id`, `start_time`, `end_time`, `page_size`, `channel`

4. **Response Handling**
   - Parse messages array
   - Return each message as separate n8n item
   - Extract text from `app_message.text_message.text`

---

## Key Differences from n8n-engage

### Architecture Changes

1. **Credentials:**
   - **n8n-engage**: Simple Basic Auth (API Key + Secret)
   - **n8n-conversations**: OAuth2.0 with token caching + Basic Auth fallback

2. **Request Format:**
   - **n8n-engage**: Flat messages array
   - **n8n-conversations**: Nested object structure with recipient identities

3. **Endpoints:**
   - **n8n-engage**: Single endpoint (`https://api.messagemedia.com`)
   - **n8n-conversations**: Regional endpoints (US/EU/BR)

4. **Required Fields:**
   - **n8n-engage**: Just `to`, `message`, (optional `from`)
   - **n8n-conversations**: `app_id`, `project_id`, recipient object, message object

5. **Response Format:**
   - **n8n-engage**: `{ messages: [{ message_id, ... }] }`
   - **n8n-conversations**: `{ message_id, accepted_time }`

---

## Future Enhancements (Post-Alpha)

### Phase 2 Features
- [ ] WhatsApp channel support
- [ ] RCS channel support
- [ ] Channel priority order configuration
- [ ] Contact management operations
- [ ] Conversation management operations

### Phase 3 Features
- [ ] Rich media messages (MMS, images, videos)
- [ ] Template messages
- [ ] Interactive messages (buttons, lists)
- [ ] Webhook trigger node for inbound messages

### Phase 4 Features
- [ ] Batch messaging
- [ ] Message scheduling
- [ ] Conversation analytics
- [ ] Message transcoding endpoint integration

---

## Testing Strategy

### Manual Testing Checklist

1. **Credential Setup**
   - [ ] Test OAuth2.0 with valid credentials
   - [ ] Test OAuth2.0 with invalid credentials
   - [ ] Test Basic Auth with valid credentials
   - [ ] Test Basic Auth with invalid credentials
   - [ ] Verify credential test endpoint works

2. **Send Message**
   - [ ] Send SMS to US number (+1...)
   - [ ] Send SMS to international number (+44...)
   - [ ] Test phone normalization with local format
   - [ ] Test with callback URL
   - [ ] Test with metadata
   - [ ] Test message length validation
   - [ ] Test invalid phone number error

3. **List Messages**
   - [ ] List all messages for app
   - [ ] Filter by contact_id
   - [ ] Filter by conversation_id
   - [ ] Filter by date range
   - [ ] Test pagination with page_size
   - [ ] Filter by SMS channel

4. **Regional Endpoints**
   - [ ] Test US region
   - [ ] Test EU region
   - [ ] Test BR region

5. **Error Handling**
   - [ ] Test 401 Unauthorized
   - [ ] Test 403 Forbidden (wrong project)
   - [ ] Test 404 Not Found (wrong app_id)
   - [ ] Test 429 Rate Limit
   - [ ] Test 500 Server Error

---

## Resources & References

### Sinch Documentation
- [Conversations API Overview](https://developers.sinch.com/docs/conversation/)
- [Send Message Endpoint](https://developers.sinch.com/docs/conversation/api-reference/conversation/messages/messages_sendmessage)
- [List Messages Endpoint](https://developers.sinch.com/docs/conversation/api-reference/conversation/messages/messages_listmessages)
- [OAuth2.0 Authentication](https://developers.sinch.com/docs/conversation/api-reference/conversation/#authentication)
- [Channel Support (SMS)](https://developers.sinch.com/docs/conversation/channel-support/sms/)

### n8n Documentation
- [Creating Nodes](https://docs.n8n.io/integrations/creating-nodes/)
- [Credentials](https://docs.n8n.io/integrations/creating-nodes/code/credentials/)
- [Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

### Internal Reference
- **Base Implementation**: `/n8n/n8n-engage/`
- **Deployment Scripts**: `/n8n/n8n-engage/deploy/`
- **Testing Patterns**: `/n8n/n8n-engage/tests/`

---

## Success Criteria

### Alpha Release (`1.0.0-alpha-0`)
- [ ] Send SMS via Conversations API with OAuth2.0
- [ ] List messages with basic filtering
- [ ] Phone number normalization working
- [ ] Regional endpoint selection functional
- [ ] Installable as n8n community node
- [ ] Basic documentation complete
- [ ] Manual testing passed

### Beta Release (`1.0.0-beta-0`)
- [ ] All alpha features stable
- [ ] Comprehensive unit test coverage (>80%)
- [ ] Error handling tested and refined
- [ ] Example workflows documented
- [ ] Performance optimized (token caching, request pooling)

### GA Release (`1.0.0`)
- [ ] Production-ready stability
- [ ] n8n community approval process completed
- [ ] Full documentation with screenshots
- [ ] Support for 3+ regional endpoints verified
- [ ] Security audit completed
- [ ] Published to `@sinch-engage` NPM organization

---

## Timeline Estimate

| Phase                           | Duration    | Deliverable                     |
| ------------------------------- | ----------- | ------------------------------- |
| **Phase 1**: Foundation & Setup | 3 days      | Project structure, dependencies |
| **Phase 2**: Credentials & Auth | 2 days      | OAuth2.0 implementation         |
| **Phase 3**: Send Message       | 3 days      | Core send functionality         |
| **Phase 4**: List Messages      | 2 days      | Query and filtering             |
| **Phase 5**: Testing            | 3 days      | Unit + integration tests        |
| **Phase 6**: Documentation      | 2 days      | README, CHANGELOG, DEPLOYMENT   |
| **Phase 7**: Alpha Deployment   | 1 day       | NPM alpha release               |
| **Phase 8**: Beta Refinement    | 4 days      | Bug fixes, optimization         |
| **Total**                       | **20 days** | Alpha + Beta ready              |

---

## Contact & Support

**Implementation Team:**
- Lead Developer: [TBD]
- API Integration: [TBD]
- Testing: [TBD]

**Sinch Resources:**
- Dashboard: https://dashboard.sinch.com
- Support: https://www.sinch.com/support/

**NPM Package:**
- Alpha: `@sinch-engage/n8n-nodes-sinch-build-conversations@alpha`
- Beta: `@sinch-engage/n8n-nodes-sinch-build-conversations@beta`
- GA: `@sinch-engage/n8n-nodes-sinch-build-conversations`

---

## Appendix A: Example Workflow

### Basic SMS Send Workflow

```json
{
  "name": "Send SMS via Sinch Build Conversations",
  "nodes": [
    {
      "parameters": {
        "resource": "message",
        "operation": "send",
        "to": "+15551234567",
        "message": "Hello from n8n!",
        "additionalFields": {
          "callbackUrl": "https://webhook.site/unique-id"
        }
      },
      "type": "@sinch-engage/n8n-nodes-sinch-build-conversations.SinchBuildConversations",
      "typeVersion": 1,
      "position": [250, 300],
      "id": "abc123",
      "name": "Sinch Build Conversations",
      "credentials": {
        "SinchBuildConversationsApi": {
          "id": "1",
          "name": "Sinch Build Conversations API"
        }
      }
    }
  ],
  "connections": {}
}
```

---

## Appendix B: Error Code Reference

| HTTP Code | Sinch Status       | Description            | Resolution                               |
| --------- | ------------------ | ---------------------- | ---------------------------------------- |
| 400       | INVALID_ARGUMENT   | Malformed request body | Check app_id, project_id, message format |
| 401       | UNAUTHENTICATED    | Invalid credentials    | Verify Key ID and Secret                 |
| 403       | UNAUTHORIZED       | No access to resource  | Check project_id matches credentials     |
| 404       | NOT_FOUND          | Resource not found     | Verify app_id exists, region matches     |
| 429       | RESOURCE_EXHAUSTED | Rate limit exceeded    | Implement backoff, check rate limits     |
| 500       | INTERNAL           | Server error           | Retry with exponential backoff           |

---

## Appendix C: Phone Number Format Examples

| Input Format       | Country | Output (E.164)  | Valid?           |
| ------------------ | ------- | --------------- | ---------------- |
| `+15551234567`     | (Any)   | `+15551234567`  | ✅ Yes            |
| `5551234567`       | US      | `+15551234567`  | ✅ Yes            |
| `0437536808`       | AU      | `+61437536808`  | ✅ Yes            |
| `+44 20 7946 0958` | UK      | `+442079460958` | ✅ Yes            |
| `1234`             | US      | Error           | ❌ No (too short) |
| `not-a-number`     | US      | Error           | ❌ No (invalid)   |

---

**End of Plan Document**

*This plan serves as the comprehensive blueprint for building the Sinch Build Conversations API n8n connector. Follow each phase sequentially, referring to the n8n-engage implementation for proven patterns.*
