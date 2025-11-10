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
  channel_properties?: {
    SMS_SENDER?: string;
  };
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

// Message structure from List Messages endpoint
export interface ConversationMessage {
  id: string;
  direction: 'TO_CONTACT' | 'TO_APP' | 'UNDEFINED_DIRECTION';
  accept_time: string;
  channel_identity: {
    channel: SinchChannel;
    identity: string;
    app_id?: string;
  };
  contact_id?: string;
  conversation_id?: string;
  app_message?: {
    text_message?: {
      text: string;
    };
  };
  contact_message?: {
    text_message?: {
      text: string;
    };
  };
  metadata?: string;
}

// Message structure from Get Message endpoint (may have additional fields)
export interface GetMessageResponse {
  id: string;
  direction: 'TO_CONTACT' | 'TO_APP' | 'UNDEFINED_DIRECTION';
  accept_time: string;
  channel_identity: {
    channel: SinchChannel;
    identity: string;
    app_id?: string;
  };
  contact_id?: string;
  conversation_id?: string;
  metadata?: string;
  injected?: boolean;
  sender_id?: string;
  processing_mode?: 'CONVERSATION' | 'DISPATCH';
  // Note: Get Message endpoint may not include app_message/contact_message
  app_message?: {
    text_message?: {
      text: string;
    };
  };
  contact_message?: {
    text_message?: {
      text: string;
    };
  };
}

// Provider send parameters
export interface ProviderSendParams {
  to: string; // Phone number in E.164 format
  message: string;
  from?: string; // Optional sender identifier
  smsSender?: string; // SMS sender address (channel_properties.SMS_SENDER)
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
  requestBody?: unknown; // Request body for debugging
  error?: string;
}

