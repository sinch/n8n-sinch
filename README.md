# n8n-nodes-sinch

Community node for n8n to send and manage omnichannel messages via Sinch Conversations API.

## ✨ Features

- **Send SMS messages** via Sinch Conversations API
- **List messages** with filtering and pagination
- **OAuth2.0 authentication** with automatic token management
- **Multi-region support** (US, EU, BR)
- **Phone number normalization** to E.164 format
- **Robust error handling** and validation

## 🎯 Node Configuration

### Basic Information

- **Display Name**: Sinch
- **Name**: `Sinch`
- **Group**: `transform`
- **Inputs**: `main`
- **Outputs**: `main`

### Operations

#### Send Message

Send SMS messages via Sinch Conversations API.

**Fields:**
- **To** (required) - Recipient phone number in E.164 format (e.g., +15551234567)
- **Country** (optional) - Country for parsing local phone numbers without international prefix
- **Message** (required, up to 1600 characters) - Message text to send
- **Callback URL** (optional) - Webhook URL for delivery status updates
- **Metadata** (optional) - Custom metadata to associate with the message (up to 1024 characters)

#### List Messages

List and filter messages from conversations.

**Filters:**
- **Contact ID** - Filter by contact ID
- **Conversation ID** - Filter by conversation ID
- **Start Time** - Filter messages after this timestamp
- **End Time** - Filter messages before this timestamp
- **Page Size** - Number of messages to return (max 1000, default: 10)
- **Channel** - Filter by channel (SMS, WhatsApp, RCS)

## 🔐 Credentials

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
3. Generate API keys in Settings → Access Keys
4. Create a Conversation API app
5. Note your Project ID and App ID

## 📱 Sinch Conversations API Integration

### API Endpoints

- **US**: `https://us.conversation.api.sinch.com`
- **EU**: `https://eu.conversation.api.sinch.com`
- **BR**: `https://br.conversation.api.sinch.com`

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

### List Messages

**Endpoint**: `GET /v1/projects/{projectId}/messages`

**Query Parameters:**
- `app_id` (required)
- `contact_id` (optional)
- `conversation_id` (optional)
- `start_time` (optional, ISO 8601)
- `end_time` (optional, ISO 8601)
- `page_size` (optional, max 1000)
- `channel` (optional)

## 🔄 Authentication

### OAuth2.0

OAuth2.0 authentication is automatically handled:
1. Tokens are fetched from `https://auth.sinch.com/oauth2/token`
2. Tokens are cached for 55 minutes (5-minute buffer before expiry)
3. Tokens are automatically refreshed when expired
4. Bearer tokens are used in Authorization headers

## 📞 Phone Number Format

### E.164 Format

Phone numbers must be in E.164 format:
- **International format**: `+15551234567`
- **Local format**: `5551234567` (requires Country field)

### Supported Formats

- `+15551234567` (international format)
- `15551234567` with Country = US → `+15551234567`
- `0437536808` with Country = AU → `+61437536808`
- `00` prefix is automatically converted to `+`

## 📋 Example Workflow

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
      "type": "@sinch-engage/n8n-nodes-sinch.Sinch",
      "typeVersion": 1,
      "position": [250, 300],
      "id": "abc123",
      "name": "Sinch Build Conversations",
      "credentials": {
        "SinchApi": {
          "id": "1",
          "name": "Sinch Conversations API"
        }
      }
    }
  ],
  "connections": {}
}
```

## 🛠️ Troubleshooting

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

## 📚 Resources

- **Sinch Conversations API Docs**: https://developers.sinch.com/docs/conversation/
- **Send Message Endpoint**: https://developers.sinch.com/docs/conversation/api-reference/conversation/messages/messages_sendmessage
- **List Messages Endpoint**: https://developers.sinch.com/docs/conversation/api-reference/conversation/messages/messages_listmessages
- **OAuth2.0 Guide**: https://developers.sinch.com/docs/conversation/api-reference/conversation/#oauth20-authentication
- **Sinch Dashboard**: https://dashboard.sinch.com

## 📄 License

MIT License

## 🤝 Contributing

This is a Sinch internal project. For questions or contributions:
1. Review documentation thoroughly
2. Follow established patterns from n8n-engage
3. Maintain code quality standards
4. Write comprehensive tests
5. Update documentation with changes


