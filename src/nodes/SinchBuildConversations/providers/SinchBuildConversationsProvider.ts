import { ProviderStrategy } from './ProviderStrategy';
import { ProviderHttpError } from '../../../utils/errors';
import { makeSinchBuildConversationsRequest } from '../../../utils/sinchBuildConversationsHttp';
import type {
  SendMessageRequest,
  SendMessageResponse,
  ProviderSendParams,
  ProviderSendResult,
} from '../types';

export class SinchBuildConversationsProvider implements ProviderStrategy {
  async send(params: ProviderSendParams): Promise<ProviderSendResult> {
    const { to, message, smsSender, callbackUrl, metadata, helpers, credentials } = params;

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

    // Add channel properties (SMS sender address)
    if (smsSender) {
      requestBody.channel_properties = {
        SMS_SENDER: smsSender,
      };
    }

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
        requestBody, // Include request body for debugging
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

