# n8n-nodes-sinch

Community node for n8n to send and manage omnichannel messages via Sinch Conversations API.

## Installation

### Using n8n Community Nodes

1. Open your n8n instance
2. Go to **Settings** > **Community Nodes**
3. Enter `@sinch/n8n-nodes-sinch`
4. Click **Install**

### Manual Installation

```bash
cd ~/.n8n
npm install @sinch/n8n-nodes-sinch
```

## Compatibility

- **n8n**: 1.0.0 or later
- **Node.js**: 20.19 or later (up to 24.x)

## Features

- **Send SMS messages** via Sinch Conversations API (routed through Econexus)
- **Send WhatsApp Template Message** with approved templates from Sinch Provisioning API
- **Get Many messages** with filtering and pagination
- **Message Delivered trigger** via Econexus ISS webhook subscriptions
- **OAuth2.0 authentication** with automatic token management
- **Multi-region support** (US, EU, BR)
- **Phone number normalization** to E.164 format
- **Robust error handling** and validation

## Node Configuration

### Basic Information

- **Display Name**: Sinch
- **Name**: `sinch`
- **Group**: `output`
- **Inputs**: `main`
- **Outputs**: `main`

### Operations

#### Send Message

Send SMS messages via Sinch Conversations API.

**Fields:**
- **To** (required) - Recipient phone number in E.164 format (e.g., +15551234567)
- **Country** (optional) - Country for parsing local phone numbers without international prefix
- **Message** (required, up to 1600 characters) - Message text to send
- **SMS Sender** (optional) - Sender address (alphanumeric or phone number)
- **Callback URL** (optional) - Webhook URL for delivery status updates
- **Metadata** (optional) - Custom metadata to associate with the message (up to 1024 characters)

#### Send WhatsApp Template Message

Send an approved WhatsApp template via Sinch Conversation API. Templates are loaded from the Sinch Provisioning API; body placeholders (`{{1}}`, `{{2}}`, …) are shown as input fields after you select a template.

**Fields:**
- **To** (required) - Recipient WhatsApp number in E.164 format (e.g., +14155552671)
- **WhatsApp Template Name or ID** (required) - Approved template from your Sinch project (value format: `templateName,languageCode`)
- **Template Body Variable Count Name or ID** - Auto-loaded when the template changes; lists how many body variables the template expects
- **Variable {{1}}** … **Variable {{20}}** - Shown based on the template variable count (up to 20 placeholders)

**API endpoints used:**
- List templates: `GET https://provisioning.api.sinch.com/v1/projects/{projectId}/whatsapp/templates?filterStates=APPROVED`
- Template detail: `GET .../whatsapp/templates/{name}/languages/{language}`
- Send: `POST https://{au|eu}.app.api.sinch.com/v1/econexus/sinch-build/v1/projects/{projectId}/messages:send`

#### Get Many Messages

Retrieve and filter messages from conversations.

**Controls:**
- **Return All** - Whether to return all results or only up to a given limit
- **Limit** - Max number of results to return (default: 50)

**Filters:**
- **Contact ID** - Filter by contact ID
- **Conversation ID** - Filter by conversation ID
- **Start Time** - Filter messages after this timestamp
- **End Time** - Filter messages before this timestamp
- **Page Size** - Number of messages per page (max 1000, default: 10)
- **Channel** - Filter by channel (SMS, WhatsApp, RCS)

### Sinch Trigger

Webhook trigger for message delivery events.

**Events:**
- **Message Delivered** - Fires when a `MESSAGE_DELIVERY` webhook is received with status `DELIVERED`

When a workflow is activated, the trigger registers an ISS subscription with Econexus. When the workflow is deactivated, the subscription is removed automatically.

**Output fields:**
- `messageId`, `conversationId`, `deliveryStatus`, `channel`, `contactIdentity`, `contactId`, `appId`, `projectId`, `eventTime`, `acceptedTime`, `metadata`

## Credentials

### Sinch Conversations API

**Required Fields:**
- **Key ID (Client ID)** - Your Sinch API Key ID from the dashboard
- **Key Secret (Client Secret)** - Your Sinch API Key Secret from the dashboard
- **Region** - Region where your Conversation API app was created (US, EU, or BR)
- **Project ID** - Your Sinch Project ID from the dashboard
- **App ID** - Your Sinch Conversation API App ID

**Authentication:** OAuth2.0 (automatic token management)

### Getting Your Credentials

1. Create a Sinch account at https://dashboard.sinch.com
2. Create a project
3. Generate API keys in Settings > Access Keys
4. Create a Conversation API app
5. Note your Project ID and App ID

## API Endpoints

All Conversation API requests are routed through the Econexus Sinch Build proxy:

- **US / BR**: `https://au.app.api.sinch.com/v1/econexus/sinch-build`
- **EU**: `https://eu.app.api.sinch.com/v1/econexus/sinch-build`

ISS webhook subscriptions:

- **US / BR**: `https://au.app.api.sinch.com/v1/econexus/iss/subscriptions`
- **EU**: `https://eu.app.api.sinch.com/v1/econexus/iss/subscriptions`

### Send Message

**Endpoint**: `POST /v1/projects/{projectId}/messages:send`

**Request Body:**
```json
{
  "app_id": "your-app-id",
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

**Response:**
```json
{
  "message_id": "msg-123",
  "accepted_time": "2024-01-01T00:00:00Z"
}
```

### Get Many Messages

**Endpoint**: `GET /v1/projects/{projectId}/messages`

**Query Parameters:**
- `app_id` (required)
- `contact_id` (optional)
- `conversation_id` (optional)
- `start_time` (optional, ISO 8601)
- `end_time` (optional, ISO 8601)
- `page_size` (optional, max 1000)
- `channel` (optional)

## Authentication

OAuth2.0 authentication is automatically handled:
1. Tokens are fetched from `https://{region}.auth.sinch.com/oauth2/token`
2. Tokens are cached for 55 minutes (5-minute buffer before expiry)
3. Tokens are automatically refreshed when expired
4. Bearer tokens are used in Authorization headers
5. Econexus proxy headers (`X-AUTH-SOURCE`, `X-SINCH-APP-ID`, `X-SINCH-PROJECT-ID`, `X-CLIENT-SOURCE`) are sent on all Econexus requests

## Phone Number Format

### E.164 Format

Phone numbers must be in E.164 format:
- **International format**: `+15551234567`
- **Local format**: `5551234567` (requires Country field)

### Supported Formats

- `+15551234567` (international format)
- `15551234567` with Country = US -> `+15551234567`
- `0437536808` with Country = AU -> `+61437536808`
- `00` prefix is automatically converted to `+`

## Example Workflow

```json
{
  "name": "Send SMS via Sinch",
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
      "type": "@sinch/n8n-nodes-sinch.sinch",
      "typeVersion": 1,
      "position": [250, 300],
      "id": "abc123",
      "name": "Sinch",
      "credentials": {
        "sinchApi": {
          "id": "1",
          "name": "Sinch Conversations API"
        }
      }
    }
  ],
  "connections": {}
}
```

## Troubleshooting

### Common Issues

- **401 Unauthorized**: Check your Key ID and Key Secret
- **403 Forbidden**: Verify your Project ID matches the credentials
- **404 Not Found**: Verify your App ID exists and region matches
- **429 Rate Limit**: Implement backoff or check Sinch API rate limits
- **Invalid phone number**: Ensure phone number is in E.164 format or provide Country field

### Error Codes

| HTTP Code | Sinch Status | Description | Resolution |
|-----------|--------------|-------------|------------|
| 400 | INVALID_ARGUMENT | Malformed request body | Check app_id, project_id, message format |
| 401 | UNAUTHENTICATED | Invalid credentials | Verify Key ID and Secret |
| 403 | UNAUTHORIZED | No access to resource | Check project_id matches credentials |
| 404 | NOT_FOUND | Resource not found | Verify app_id exists, region matches |
| 429 | RESOURCE_EXHAUSTED | Rate limit exceeded | Implement backoff, check rate limits |
| 500 | INTERNAL | Server error | Retry with exponential backoff |

## Resources

- **Sinch Conversations API Docs**: https://developers.sinch.com/docs/conversation/
- **Send Message Endpoint**: https://developers.sinch.com/docs/conversation/api-reference/conversation/messages/messages_sendmessage
- **List Messages Endpoint**: https://developers.sinch.com/docs/conversation/api-reference/conversation/messages/messages_listmessages
- **OAuth2.0 Guide**: https://developers.sinch.com/docs/conversation/api-reference/conversation/#oauth20-authentication
- **Sinch Dashboard**: https://dashboard.sinch.com

## License

MIT License

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue on the [GitHub repository](https://github.com/sinch/n8n-sinch/issues) before submitting a pull request.
