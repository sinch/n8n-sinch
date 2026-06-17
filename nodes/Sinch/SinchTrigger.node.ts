import type {
  IHookFunctions,
  INode,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  IDataObject,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { makeIssRequest } from '../../utils/sinchHttp';
import type {
  IssSubscriptionResponse,
  MessageDeliveryOutput,
  MessageDeliveryWebhook,
  SinchWebhookData,
} from './types';

function mapMessageDeliveryPayload(body: MessageDeliveryWebhook): MessageDeliveryOutput {
  const report = body.message_delivery_report!;
  return {
    messageId: report.message_id,
    conversationId: report.conversation_id,
    deliveryStatus: report.status,
    channel: report.channel_identity.channel,
    contactIdentity: report.channel_identity.identity,
    contactId: report.contact_id ?? '',
    appId: body.app_id ?? '',
    projectId: body.project_id ?? '',
    eventTime: body.event_time ?? '',
    acceptedTime: body.accepted_time ?? '',
    metadata: report.metadata ?? '',
  };
}

function toIssNodeApiError(
  node: INode,
  error: unknown,
  action: 'register' | 'remove',
): NodeApiError {
  const message = action === 'register'
    ? 'Could not register the message delivery webhook with Sinch'
    : 'Could not remove the message delivery webhook from Sinch';

  return new NodeApiError(node, error as JsonObject, {
    message,
    description: 'Verify your Sinch credentials and that the workflow webhook URL is reachable, then deactivate and reactivate the workflow',
  });
}

export class SinchTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sinch Trigger',
    name: 'sinchTrigger',
    icon: 'file:sinch.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: 'Starts the workflow when a message delivery report is received via Sinch Conversations API',
    defaults: {
      name: 'Sinch Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      { name: 'sinchApi', required: true },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'sinch',
      },
    ],
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        options: [
          {
            name: 'Message Delivered',
            value: 'messageDelivered',
            description: 'Triggers when a message delivery report with status DELIVERED is received',
          },
        ],
        default: 'messageDelivered',
        required: true,
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node') as unknown as SinchWebhookData;
        return Boolean(webhookData.subscriptionId);
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');

        try {
          const response = await makeIssRequest<IssSubscriptionResponse>(this, {
            method: 'POST',
            body: {
              subscriptionType: 'HTTP',
              targetPlatform: 'n8n',
              providerId: 'sinchbuild',
              eventTypes: ['MESSAGE_DELIVERY'],
              targetUrl: webhookUrl,
            },
          });

          if (!response.subscriptionId) {
            throw new NodeOperationError(
              this.getNode(),
              'Sinch did not provide a webhook subscription ID',
              {
                description: 'Deactivate and reactivate the workflow to register the webhook again. If this continues, contact Sinch support',
              },
            );
          }

          const webhookData = this.getWorkflowStaticData('node') as unknown as SinchWebhookData;
          webhookData.subscriptionId = response.subscriptionId;

          return true;
        } catch (error) {
          if (error instanceof NodeOperationError) {
            throw error;
          }
          throw toIssNodeApiError(this.getNode(), error, 'register');
        }
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node') as unknown as SinchWebhookData;

        if (!webhookData.subscriptionId) {
          return true;
        }

        try {
          await makeIssRequest(this, {
            method: 'DELETE',
            subscriptionId: webhookData.subscriptionId,
          });

          delete webhookData.subscriptionId;

          return true;
        } catch (error) {
          throw toIssNodeApiError(this.getNode(), error, 'remove');
        }
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const body = this.getBodyData() as MessageDeliveryWebhook;
    const event = this.getNodeParameter('event') as string;

    if (event !== 'messageDelivered') {
      return { workflowData: [[]] };
    }

    if (!body.message_delivery_report || body.message_delivery_report.status !== 'DELIVERED') {
      return { workflowData: [[]] };
    }

    const output = mapMessageDeliveryPayload(body);

    return {
      workflowData: [
        this.helpers.returnJsonArray([output as unknown as IDataObject]),
      ],
    };
  }
}
