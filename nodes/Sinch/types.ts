import type { IExecuteFunctions } from 'n8n-workflow';

export type SinchRegion = 'us' | 'eu' | 'br';
export type SinchChannel = 'SMS' | 'WHATSAPP' | 'RCS' | 'MESSENGER' | 'VIBERBM';
export type MessageStatus = 'queued' | 'sent' | 'failed';

// Credentials structure
// Note: Authentication is always OAuth2.0
export interface SinchCredentials {
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

// WhatsApp template message types
export interface WhatsAppChannelTemplate {
  template_id: string;
  language_code: string;
  parameters?: Record<string, string>;
}

export interface TemplateMessage {
  channel_template: {
    WHATSAPP: WhatsAppChannelTemplate;
  };
}

// WhatsApp template from Provisioning API
export interface WhatsAppTemplate {
  name: string;
  language: string;
  state?: string;
  category?: string;
  details?: {
    components?: Array<{
      type: string;
      text?: string;
      examples?: string[];
    }>;
  };
}

export interface ListTemplatesResponse {
  templates: WhatsAppTemplate[];
  next_page_token?: string;
}

// Send message request structure (to Sinch API)
export interface SendMessageRequest {
  app_id: string;
  recipient: {
    identified_by?: {
      channel_identities: Array<{
        channel: SinchChannel;
        identity: string;
        app_id?: string;
      }>;
    };
    contact_id?: string;
  };
  message: {
    text_message?: {
      text: string;
    };
    template_message?: TemplateMessage;
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
  [key: string]: string | number | boolean | undefined;
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
  credentials: SinchCredentials;
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

// ISS subscription response
export interface IssSubscriptionResponse {
  subscriptionId: string;
}

// Webhook data stored by n8n for ISS lifecycle
export interface SinchWebhookData {
  subscriptionId?: string;
}

// Inbound MESSAGE_DELIVERY webhook payload
export interface MessageDeliveryWebhook {
  app_id?: string;
  project_id?: string;
  event_time?: string;
  accepted_time?: string;
  message_delivery_report?: {
    message_id: string;
    conversation_id: string;
    status: string;
    channel_identity: {
      channel: SinchChannel;
      identity: string;
      app_id?: string;
    };
    contact_id?: string;
    metadata?: string;
  };
}

// Normalized message delivery trigger output
export interface MessageDeliveryOutput {
  messageId: string;
  conversationId: string;
  deliveryStatus: string;
  channel: string;
  contactIdentity: string;
  contactId: string;
  appId: string;
  projectId: string;
  eventTime: string;
  acceptedTime: string;
  metadata: string;
}

// Provider send WhatsApp template parameters
export interface ProviderSendWhatsAppParams {
  to: string;
  templateId: string;
  languageCode: string;
  parameters?: Record<string, string>;
  helpers: IExecuteFunctions['helpers'];
  credentials: SinchCredentials;
}

