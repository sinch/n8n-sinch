import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeListSearchResult,
  INodeType,
  INodeTypeDescription,
  IDataObject,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { normalizePhoneNumberToE164 } from '../../utils/phone';
import { SinchProvider } from './providers/SinchProvider';
import { makeSinchRequest, makeProvisioningRequest } from '../../utils/sinchHttp';
import type {
  SinchCredentials,
  SinchChannel,
  ListMessagesResponse,
  ListMessagesParams,
  ListTemplatesResponse,
  WhatsAppTemplate,
} from './types';
import { getNames } from '../../utils/countryCodes';
import {
  buildTemplateVariableCountOptions,
  getTemplateBodyVariables,
} from '../../utils/whatsappTemplate';
import { buildWhatsAppTemplateVariableFields } from '../../utils/whatsappTemplateProperties';

// Generate country list for dropdown (sorted alphabetically by name)
function getCountryOptions() {
  const countryList = getNames();
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
    name: 'sinch',
    icon: 'file:sinch.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Send and manage omnichannel messages via Sinch Conversations API',
    defaults: {
      name: 'Sinch',
    },
    // eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
    inputs: [NodeConnectionTypes.Main],
    // eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      { name: 'sinchApi', required: true },
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
            name: 'Get Many',
            value: 'getMany',
            description: 'Retrieve messages from conversations',
            action: 'Get many messages',
          },
          {
            name: 'Send',
            value: 'send',
            description: 'Send an SMS message via Conversations API',
            action: 'Send a message',
          },
          {
            name: 'Send WhatsApp Template',
            value: 'sendWhatsAppTemplate',
            description: 'Send an approved WhatsApp template message via Conversations API',
            // eslint-disable-next-line n8n-nodes-base/node-param-operation-option-action-miscased -- WhatsApp is a product name
            action: 'Send a WhatsApp template message',
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
        description: 'Recipient phone number. Accepts E.164 format (e.g., +15551234567) or local format (e.g., 5551234567) if Country is specified.',
        placeholder: 'e.g. +15551234567',
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
        placeholder: 'e.g. Hello from n8n!',
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
            placeholder: 'e.g. https://example.com/webhook',
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

      // SEND WHATSAPP TEMPLATE FIELDS
      {
        displayName: 'To',
        name: 'whatsappTo',
        type: 'string',
        required: true,
        default: '',
        description: 'Recipient WhatsApp phone number in E.164 format (e.g. +14155552671)',
        placeholder: 'e.g. +14155552671',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendWhatsAppTemplate'],
          },
        },
      },
      {
        displayName: 'WhatsApp Template Name or ID',
        name: 'whatsappTemplateId',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getWhatsAppTemplates',
        },
        required: true,
        default: '',
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        hint: 'Only APPROVED templates. Value format: templateName,languageCode',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendWhatsAppTemplate'],
          },
        },
      },
      {
        displayName: 'Template Body Variable Count Name or ID',
        name: 'templateVariableCount',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getWhatsAppTemplateVariableCount',
          loadOptionsDependsOn: ['whatsappTemplateId'],
        },
        default: '0',
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        hint: 'Auto-loaded when you change WhatsApp Template Name or ID. Controls how many {{N}} variable fields appear below',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['sendWhatsAppTemplate'],
          },
        },
      },
      ...buildWhatsAppTemplateVariableFields(),

      // LIST MESSAGES - RETURN ALL / LIMIT
      {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        default: false,
        description: 'Whether to return all results or only up to a given limit',
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['getMany'],
          },
        },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 50,
        description: 'Max number of results to return',
        typeOptions: {
          minValue: 1,
        },
        displayOptions: {
          show: {
            resource: ['message'],
            operation: ['getMany'],
            returnAll: [false],
          },
        },
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
            operation: ['getMany'],
          },
        },
        options: [
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
            description: 'Number of messages per page (max 1000)',
            typeOptions: {
              minValue: 1,
              maxValue: 1000,
            },
          },
          {
            displayName: 'Start Time',
            name: 'startTime',
            type: 'dateTime',
            default: '',
            description: 'Filter messages after this timestamp',
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getWhatsAppTemplates(this: ILoadOptionsFunctions): Promise<INodeListSearchResult['results']> {
        const credentials = (await this.getCredentials('sinchApi')) as SinchCredentials;
        const response = await makeProvisioningRequest<ListTemplatesResponse>(this, {
          method: 'GET',
          endpoint: `/v1/projects/${credentials.projectId}/whatsapp/templates`,
          qs: { pageSize: 100, filterStates: 'APPROVED' },
        });

        const templates = response.templates || [];
        return templates
          .map((t) => ({
            name: `${t.name} (${t.language})`,
            value: `${t.name},${t.language}`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      },

      async getWhatsAppTemplateVariableCount(
        this: ILoadOptionsFunctions,
      ): Promise<INodeListSearchResult['results']> {
        const templateValue = this.getCurrentNodeParameter('whatsappTemplateId') as string;

        if (!templateValue) {
          return [{ name: 'Select a WhatsApp Template First', value: '0' }];
        }

        const [templateName, languageCode] = templateValue.split(',').map((s) => s.trim());
        if (!templateName || !languageCode) {
          return [{ name: 'Invalid Template Selection', value: '0' }];
        }

        try {
          const credentials = (await this.getCredentials('sinchApi')) as SinchCredentials;
          const template = await makeProvisioningRequest<WhatsAppTemplate>(this, {
            method: 'GET',
            endpoint: `/v1/projects/${credentials.projectId}/whatsapp/templates/${templateName}/languages/${languageCode}`,
          });

          const variables = getTemplateBodyVariables(template);
          return buildTemplateVariableCountOptions(variables);
        } catch {
          return [{
            name: 'Could Not Load Template Variables — Re-Select the Template or Check Credentials',
            value: '0',
          }];
        }
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = (await this.getCredentials('sinchApi')) as SinchCredentials;
    const provider = new SinchProvider();

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
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
            throw new NodeOperationError(
              this.getNode(),
              'Message must be between 1 and 1600 characters',
              { itemIndex },
            );
          }

          // Normalize phone number to E.164
          const toResult = normalizePhoneNumberToE164(toRaw, defaultCountry);
          if (!toResult.ok) {
            throw new NodeOperationError(
              this.getNode(),
              `Invalid phone number: ${toResult.error}`,
              { itemIndex },
            );
          }

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
                provider: 'Sinch Conversations',
                channel: 'SMS',
                raw: providerResult.raw,
              } as unknown as IDataObject,
              pairedItem: { item: itemIndex },
            });
          } catch (error) {
            throw new NodeApiError(this.getNode(), error as JsonObject, {
              message: (error as Error).message,
              itemIndex,
            });
          }
        } else if (operation === 'sendWhatsAppTemplate') {
          // SEND WHATSAPP TEMPLATE OPERATION
          const toRaw = this.getNodeParameter('whatsappTo', itemIndex) as string;
          const templateValue = this.getNodeParameter('whatsappTemplateId', itemIndex) as string;
          const variableCount = parseInt(
            this.getNodeParameter('templateVariableCount', itemIndex, '0') as string,
            10,
          ) || 0;

          // Validate E.164 phone number
          const toResult = normalizePhoneNumberToE164(toRaw, undefined);
          if (!toResult.ok) {
            throw new NodeOperationError(
              this.getNode(),
              `Invalid phone number: ${toResult.error}`,
              { itemIndex },
            );
          }

          if (!templateValue) {
            throw new NodeOperationError(
              this.getNode(),
              'A WhatsApp template must be selected',
              { itemIndex },
            );
          }

          const [templateId, languageCode] = templateValue.split(',').map((s) => s.trim());
          if (!templateId || !languageCode) {
            throw new NodeOperationError(
              this.getNode(),
              'Invalid template selection — expected "templateName,languageCode"',
              { itemIndex },
            );
          }

          const parameters: Record<string, string> = {};
          for (let i = 1; i <= variableCount; i++) {
            const val = this.getNodeParameter(`var${i}`, itemIndex, '') as string;
            if (val) {
              parameters[`body[${i}]text`] = val;
            }
          }

          try {
            const providerResult = await provider.sendWhatsAppTemplate({
              to: toResult.value,
              templateId,
              languageCode,
              parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
              helpers: this.helpers,
              credentials,
            });

            returnData.push({
              json: {
                messageId: providerResult.messageId,
                status: providerResult.status,
                acceptedTime: providerResult.acceptedTime,
                to: toResult.value,
                templateId,
                languageCode,
                provider: 'Sinch Conversations',
                channel: 'WHATSAPP',
                raw: providerResult.raw,
              } as unknown as IDataObject,
              pairedItem: { item: itemIndex },
            });
          } catch (error) {
            throw new NodeApiError(this.getNode(), error as JsonObject, {
              message: (error as Error).message,
              itemIndex,
            });
          }
        } else if (operation === 'getMany') {
          // LIST MESSAGES OPERATION
          const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
          const limit = returnAll ? 0 : (this.getNodeParameter('limit', itemIndex) as number);
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
          if (filters.channel) queryParams.channel = filters.channel as SinchChannel;

          // Set page size: use filter value, or limit (if not returnAll and <= 1000), or default 1000
          if (filters.pageSize) {
            queryParams.page_size = filters.pageSize;
          } else if (!returnAll && limit > 0 && limit <= 1000) {
            queryParams.page_size = limit;
          } else {
            queryParams.page_size = 1000;
          }

          const endpoint = `/v1/projects/${credentials.projectId}/messages`;
          const allMessages: INodeExecutionData[] = [];
          let pageToken: string | undefined;
          const maxPages = 1000; // Safeguard against infinite loops
          let pageCount = 0;

          try {
            do {
              if (pageToken) {
                queryParams.page_token = pageToken;
              }

              const response = await makeSinchRequest<ListMessagesResponse>(this, {
                method: 'GET',
                endpoint,
                qs: queryParams,
              });

              // Process each message
              for (const msg of response.messages) {
                const text = msg.direction === 'TO_CONTACT'
                  ? (msg.app_message?.text_message?.text || '')
                  : (msg.contact_message?.text_message?.text || '');

                allMessages.push({
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
                    appMessage: msg.app_message,
                    contactMessage: msg.contact_message,
                    raw: msg,
                  } as unknown as IDataObject,
                  pairedItem: { item: itemIndex },
                });

                // Stop early if we've reached the limit
                if (!returnAll && allMessages.length >= limit) {
                  break;
                }
              }

              pageToken = response.next_page_token;
              pageCount++;

              // Stop if we've reached the limit or max pages
              if (!returnAll && allMessages.length >= limit) {
                break;
              }
            } while (pageToken && pageCount < maxPages);

            // Trim to exact limit if needed
            if (!returnAll && allMessages.length > limit) {
              allMessages.length = limit;
            }

            returnData.push(...allMessages);
          } catch (error) {
            throw new NodeApiError(this.getNode(), error as JsonObject, {
              message: (error as Error).message,
              itemIndex,
            });
          }
        }
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

