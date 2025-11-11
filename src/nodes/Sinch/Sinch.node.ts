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
import { SinchProvider } from './providers/SinchProvider';
import { makeSinchRequest } from '../../utils/sinchHttp';
import type { SinchCredentials, ListMessagesResponse, ListMessagesParams } from './types';
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

export class Sinch implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sinch',
    name: 'Sinch',
    icon: 'file:sinch-logo.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Send and manage omnichannel messages via Sinch Conversations API',
    defaults: {
      name: 'Sinch',
    },
    inputs: ['main' as NodeConnectionType],
    outputs: ['main' as NodeConnectionType],
    credentials: [
      { name: 'SinchApi', required: true },
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
          }
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
        description: 'Recipient phone number. Accepts E.164 format (e.g., +15551234567) or local format (e.g., 5551234567) if Country is specified.',
        hint: 'E.164 format: +[country code][number] (e.g., +14047691562 for US). Local format: [number] (e.g., 4047691562) if Country is selected.',
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
        description: 'Select country if using local phone number format (without + prefix). Required when phone number does not include country code.',
        hint: 'Only needed if phone number is in local format (e.g., 4047691562). If using E.164 format (e.g., +14047691562), leave empty.',
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
        hint: 'The message content that will be sent to the recipient. Maximum length: 1600 characters.',
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
            displayName: 'SMS Sender',
            name: 'smsSender',
            type: 'string',
            default: '',
            description: 'SMS sender address (alphanumeric or phone number). Leave empty to use default sender.',
            hint: 'The sender ID that will appear on the recipient\'s device. Can be alphanumeric (e.g., "MyCompany") or a phone number in E.164 format.',
          },
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
    const credentials = (await this.getCredentials('SinchApi')) as SinchCredentials;

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
            smsSender?: string;
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

          const provider = new SinchProvider();

          try {
            const providerResult = await provider.send({
              to: toResult.value,
              message,
              smsSender: additional.smsSender,
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
            const response = await makeSinchRequest<ListMessagesResponse>(this, {
              method: 'GET',
              endpoint,
              qs: queryParams,
            });

            // Return each message as a separate item
            for (const msg of response.messages) {
              // Extract text from app_message (outbound) or contact_message (inbound)
              const text = msg.direction === 'TO_CONTACT'
                ? (msg.app_message?.text_message?.text || '')
                : (msg.contact_message?.text_message?.text || '');

              returnData.push({
                json: {
                  messageId: msg.id,
                  direction: msg.direction,
                  acceptTime: msg.accept_time,
                  channel: msg.channel_identity.channel,
                  identity: msg.channel_identity.identity,
                  appId: msg.channel_identity.app_id,
                  contactId: msg.contact_id,
                  conversationId: msg.conversation_id,
                  text,
                  metadata: msg.metadata || '',
                  // Include full message structure for advanced use cases
                  appMessage: msg.app_message,
                  contactMessage: msg.contact_message,
                  // Include raw response for debugging/advanced use
                  raw: msg,
                } as unknown as IDataObject,
              });
            }

            // Include pagination token if available
            if (response.next_page_token) {
              // Add pagination info to the last item
              if (returnData.length > 0) {
                (returnData[returnData.length - 1].json as any).nextPageToken = response.next_page_token;
              }
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

