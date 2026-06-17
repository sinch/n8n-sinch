import { describe, it, expect, beforeEach, vi } from 'vitest';
import nock from 'nock';

vi.mock('n8n-workflow', async () => {
  class NodeOperationError extends Error {
    description?: string;
    constructor(_node: unknown, message: string, options?: { description?: string }) {
      super(message);
      this.description = options?.description;
    }
  }
  class NodeApiError extends Error {
    description?: string;
    constructor(_node: unknown, _error: unknown, options?: { message?: string; description?: string }) {
      super(options?.message ?? 'Unknown error');
      this.description = options?.description;
    }
  }
  return {
    NodeConnectionTypes: { Main: 'main' },
    NodeOperationError,
    NodeApiError,
  } as any;
});

import { SinchTrigger } from '../nodes/Sinch/SinchTrigger.node';
import { clearTokenCache } from '../utils/sinchHttp';
import type { SinchCredentials } from '../nodes/Sinch/types';

const mockCredentials: SinchCredentials = {
  keyId: 'FAKE-KEY-ID-11111111-1111-1111-1111-111111111111',
  keySecret: 'FAKE-SECRET-KEY-ABCDEFGHIJKLMNOP',
  region: 'us',
  projectId: 'FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222',
  appId: '01FAKETESTAPPIDABCDEFGHIJKLMN',
};

const helpers: any = {
  httpRequest: async (opts: any) => {
    const fetch = await import('node-fetch');
    const res = await (fetch.default as any)(opts.url, {
      method: opts.method || 'GET',
      headers: opts.headers,
      body: typeof opts.body === 'object' ? JSON.stringify(opts.body) : opts.body,
    });
    const text = await res.text();
    const json = JSON.parse(text);
    if (!res.ok) {
      const err: any = new Error(json?.error?.message || 'HTTP error');
      err.statusCode = res.status;
      err.response = { body: json };
      throw err;
    }
    return json;
  },
  returnJsonArray: (items: unknown[]) => items,
};

const deliveredPayload = {
  app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN',
  project_id: 'FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222',
  event_time: '2024-01-01T12:00:00Z',
  accepted_time: '2024-01-01T12:00:01Z',
  message_delivery_report: {
    message_id: 'msg-123',
    conversation_id: 'conv-456',
    status: 'DELIVERED',
    channel_identity: {
      channel: 'SMS',
      identity: '+15551234567',
    },
    contact_id: 'contact-789',
    metadata: 'meta-1',
  },
};

describe('SinchTrigger', () => {
  const trigger = new SinchTrigger();

  beforeEach(() => {
    nock.cleanAll();
    clearTokenCache();
  });

  describe('webhookMethods.default', () => {
    it('checkExists returns false when no subscription is stored', async () => {
      const staticData: Record<string, unknown> = {};
      const hookContext = {
        getWorkflowStaticData: () => staticData,
      } as any;

      const exists = await trigger.webhookMethods.default.checkExists.call(hookContext);
      expect(exists).toBe(false);
    });

    it('checkExists returns true when subscriptionId is stored', async () => {
      const staticData = { subscriptionId: 'sub-123' };
      const hookContext = {
        getWorkflowStaticData: () => staticData,
      } as any;

      const exists = await trigger.webhookMethods.default.checkExists.call(hookContext);
      expect(exists).toBe(true);
    });

    it('create registers ISS subscription and stores subscriptionId', async () => {
      nock('https://us.auth.sinch.com')
        .post('/oauth2/token')
        .reply(200, {
          access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
          token_type: 'Bearer',
          expires_in: 3600,
        });

      const issScope = nock('https://au.app.api.sinch.com')
        .post('/v1/econexus/iss/subscriptions', {
          subscriptionType: 'HTTP',
          targetPlatform: 'n8n',
          providerId: 'sinchbuild',
          eventTypes: ['MESSAGE_DELIVERY'],
          targetUrl: 'https://n8n.example.com/webhook/sinch',
        })
        .reply(200, { subscriptionId: 'sub-abc' });

      const staticData: Record<string, unknown> = {};
      const hookContext = {
        getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/sinch',
        getWorkflowStaticData: () => staticData,
        getNode: () => ({ name: 'Sinch Trigger' }),
        getCredentials: async () => mockCredentials,
        helpers,
      } as any;

      const created = await trigger.webhookMethods.default.create.call(hookContext);
      expect(created).toBe(true);
      expect(staticData.subscriptionId).toBe('sub-abc');
      expect(issScope.isDone()).toBe(true);
    });

    it('throws NodeApiError when ISS subscription registration fails', async () => {
      nock('https://us.auth.sinch.com')
        .post('/oauth2/token')
        .reply(200, {
          access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
          token_type: 'Bearer',
          expires_in: 3600,
        });

      nock('https://au.app.api.sinch.com')
        .post('/v1/econexus/iss/subscriptions')
        .reply(404, {
          error: {
            message: 'Target platform not found',
          },
        });

      const hookContext = {
        getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/sinch',
        getWorkflowStaticData: () => ({}),
        getNode: () => ({ name: 'Sinch Trigger' }),
        getCredentials: async () => mockCredentials,
        helpers,
      } as any;

      await expect(trigger.webhookMethods.default.create.call(hookContext)).rejects.toMatchObject({
        message: 'Could not register the message delivery webhook with Sinch',
      });
    });

    it('throws NodeOperationError when ISS response omits subscriptionId', async () => {
      nock('https://us.auth.sinch.com')
        .post('/oauth2/token')
        .reply(200, {
          access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
          token_type: 'Bearer',
          expires_in: 3600,
        });

      nock('https://au.app.api.sinch.com')
        .post('/v1/econexus/iss/subscriptions')
        .reply(200, {});

      const hookContext = {
        getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/sinch',
        getWorkflowStaticData: () => ({}),
        getNode: () => ({ name: 'Sinch Trigger' }),
        getCredentials: async () => mockCredentials,
        helpers,
      } as any;

      await expect(trigger.webhookMethods.default.create.call(hookContext)).rejects.toMatchObject({
        message: 'Sinch did not provide a webhook subscription ID',
      });
    });

    it('delete removes ISS subscription', async () => {
      nock('https://us.auth.sinch.com')
        .post('/oauth2/token')
        .reply(200, {
          access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
          token_type: 'Bearer',
          expires_in: 3600,
        });

      const issScope = nock('https://au.app.api.sinch.com')
        .delete('/v1/econexus/iss/subscriptions/sub-abc')
        .reply(200, {});

      const staticData = { subscriptionId: 'sub-abc' };
      const hookContext = {
        getWorkflowStaticData: () => staticData,
        getCredentials: async () => mockCredentials,
        helpers,
      } as any;

      const deleted = await trigger.webhookMethods.default.delete.call(hookContext);
      expect(deleted).toBe(true);
      expect(staticData.subscriptionId).toBeUndefined();
      expect(issScope.isDone()).toBe(true);
    });
  });

  describe('webhook', () => {
    it('maps DELIVERED message delivery payload to output fields', async () => {
      const webhookContext = {
        getBodyData: () => deliveredPayload,
        getNodeParameter: () => 'messageDelivered',
        helpers,
      } as any;

      const result = await trigger.webhook.call(webhookContext);
      const items = result.workflowData?.[0] as Array<Record<string, string>>;

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        messageId: 'msg-123',
        conversationId: 'conv-456',
        deliveryStatus: 'DELIVERED',
        channel: 'SMS',
        contactIdentity: '+15551234567',
        contactId: 'contact-789',
        appId: '01FAKETESTAPPIDABCDEFGHIJKLMN',
        projectId: 'FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222',
        eventTime: '2024-01-01T12:00:00Z',
        acceptedTime: '2024-01-01T12:00:01Z',
        metadata: 'meta-1',
      });
    });

    it('filters out non-DELIVERED statuses', async () => {
      const webhookContext = {
        getBodyData: () => ({
          ...deliveredPayload,
          message_delivery_report: {
            ...deliveredPayload.message_delivery_report,
            status: 'FAILED',
          },
        }),
        getNodeParameter: () => 'messageDelivered',
        helpers,
      } as any;

      const result = await trigger.webhook.call(webhookContext);
      expect(result.workflowData).toEqual([[]]);
    });

    it('filters out payloads without message_delivery_report', async () => {
      const webhookContext = {
        getBodyData: () => ({ app_id: 'test' }),
        getNodeParameter: () => 'messageDelivered',
        helpers,
      } as any;

      const result = await trigger.webhook.call(webhookContext);
      expect(result.workflowData).toEqual([[]]);
    });
  });
});
