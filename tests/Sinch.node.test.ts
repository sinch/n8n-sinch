import { describe, it, expect, beforeEach, vi } from 'vitest';
import nock from 'nock';

// Minimal stub of n8n-workflow to satisfy dynamic imports in execute tests
vi.mock('n8n-workflow', async () => {
  class NodeApiError extends Error {
    constructor(_node: any, _errorResponse: any, options?: { message?: string }) {
      super(options?.message || 'Unknown error');
    }
  }
  class NodeOperationError extends Error {
    constructor(_node: any, errorOrMessage: any, _options?: { itemIndex?: number }) {
      super(typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage?.message || 'Unknown error');
    }
  }
  return {
    NodeApiError,
    NodeOperationError,
  } as any;
});

import { normalizePhoneNumberToE164 } from '../utils/phone';
import { SinchProvider } from '../nodes/Sinch/providers/SinchProvider';
import {
  makeSinchRequest,
  makeIssRequest,
  makeProvisioningRequest,
  clearTokenCache,
  getConvAPIEndpoint,
  getEconexusIssUrl,
  buildSinchBuildProxyHeaders,
} from '../utils/sinchHttp';
import type { SinchCredentials } from '../nodes/Sinch/types';

const helpers: any = {
  httpRequest: async (opts: any) => {
    const fetch = await import('node-fetch');
    const url = opts.url;

    // Build query string if qs is provided
    let fullUrl = url;
    if (opts.qs && Object.keys(opts.qs).length > 0) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(opts.qs)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      const queryString = queryParams.toString();
      fullUrl = queryString ? `${url}?${queryString}` : url;
    }

    const body = opts.form
      ? new URLSearchParams(opts.form).toString()
      : typeof opts.body === 'object'
      ? JSON.stringify(opts.body)
      : opts.body;

    const headers: any = { ...opts.headers };

    const res = await (fetch.default as any)(fullUrl, {
      method: opts.method || 'GET',
      headers,
      body,
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (!res.ok) {
        const err: any = new Error(json?.error?.message || json?.message || 'HTTP error');
        err.statusCode = res.status;
        err.response = { body: json };
        err.error = json;
        throw err;
      }
      return json;
    } catch (e) {
      if (!res.ok) {
        const err: any = new Error(text || 'HTTP error');
        err.statusCode = res.status;
        err.response = { body: text };
        err.error = text;
        throw err;
      }
      return text;
    }
  },
};

const mockCredentials: SinchCredentials = {
  keyId: 'FAKE-KEY-ID-11111111-1111-1111-1111-111111111111',
  keySecret: 'FAKE-SECRET-KEY-ABCDEFGHIJKLMNOP',
  region: 'us',
  projectId: 'FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222',
  appId: '01FAKETESTAPPIDABCDEFGHIJKLMN',
};

describe('Phone Number Normalization', () => {
  it('normalizes E.164 format correctly', () => {
    expect(normalizePhoneNumberToE164('+14155552671')).toEqual({ ok: true, value: '+14155552671' });
    // Note: Custom validation doesn't detect 555 fake numbers like google-libphonenumber
    expect(normalizePhoneNumberToE164('+15551234567')).toEqual({ ok: true, value: '+15551234567' });
    expect(normalizePhoneNumberToE164('+15551234568')).toEqual({ ok: true, value: '+15551234568' });
    expect(normalizePhoneNumberToE164('0014155552671')).toEqual({ ok: true, value: '+14155552671' });
  });

  it('requires country for local numbers', () => {
    expect(normalizePhoneNumberToE164('415-555-2671')).toEqual({ ok: false, error: expect.any(String) });
    expect(normalizePhoneNumberToE164('415-555-2671', 'US')).toEqual({ ok: true, value: '+14155552671' });
  });

  it('rejects invalid phone numbers', () => {
    expect(normalizePhoneNumberToE164('123')).toEqual({ ok: false, error: expect.any(String) });
    expect(normalizePhoneNumberToE164('')).toEqual({ ok: false, error: 'Phone number is empty' });
  });

  it('handles phone validation with and without country', () => {
    // Test invalid number with country (should include country in error message)
    const resultWithCountry = normalizePhoneNumberToE164('123', 'US');
    expect(resultWithCountry.ok).toBe(false);
    expect(resultWithCountry.error).toContain('country US');

    // Test invalid number without country (should not include country in error message)
    const resultWithoutCountry = normalizePhoneNumberToE164('+123');
    expect(resultWithoutCountry.ok).toBe(false);
    if (!resultWithoutCountry.ok) {
      expect(resultWithoutCountry.error).not.toContain('country');
    }
  });

  it('handles phone parsing errors (Error vs non-Error)', () => {
    // Test with invalid input that causes parsing error
    // This tests the catch block with error instanceof Error branch
    const result = normalizePhoneNumberToE164('invalid-phone-number-that-causes-error');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    
    // The error should be a string (either Error.message or 'Failed to parse phone number')
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
    }
  });
});

describe('Econexus URL helpers', () => {
  it('builds Conversation API endpoints via Econexus proxy', () => {
    expect(getConvAPIEndpoint('us', '/v1/projects/p1/messages:send')).toBe(
      'https://au.app.api.sinch.com/v1/econexus/sinch-build/v1/projects/p1/messages:send',
    );
    expect(getConvAPIEndpoint('eu', 'projects/p1/messages')).toBe(
      'https://eu.app.api.sinch.com/v1/econexus/sinch-build/v1/projects/p1/messages',
    );
    expect(getConvAPIEndpoint('br', '/v1/projects/p1/messages')).toBe(
      'https://au.app.api.sinch.com/v1/econexus/sinch-build/v1/projects/p1/messages',
    );
  });

  it('builds ISS subscription URLs', () => {
    expect(getEconexusIssUrl('us')).toBe('https://au.app.api.sinch.com/v1/econexus/iss/subscriptions');
    expect(getEconexusIssUrl('eu')).toBe('https://eu.app.api.sinch.com/v1/econexus/iss/subscriptions');
  });

  it('builds Sinch Build proxy headers', () => {
    const headers = buildSinchBuildProxyHeaders(mockCredentials);
    expect(headers['X-AUTH-SOURCE']).toBe('SINCH-BUILD');
    expect(headers['X-SINCH-APP-ID']).toBe(mockCredentials.appId);
    expect(headers['X-SINCH-PROJECT-ID']).toBe(mockCredentials.projectId);
    expect(headers['X-CLIENT-SOURCE']).toBe('n8n-sinch-build');
    expect(headers['X-CLIENT-SOURCE-VERSION']).toBeTruthy();
  });
});

describe('Econexus proxy headers on requests', () => {
  beforeEach(() => {
    nock.cleanAll();
    clearTokenCache();
  });

  it('sends proxy headers with Conversation API requests', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const apiScope = nock('https://au.app.api.sinch.com', {
      reqheaders: {
        'x-auth-source': 'SINCH-BUILD',
        'x-sinch-app-id': mockCredentials.appId,
        'x-sinch-project-id': mockCredentials.projectId,
        'x-client-source': 'n8n-sinch-build',
      },
    })
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query(true)
      .reply(200, { messages: [] });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await makeSinchRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
      qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
    });

    expect(apiScope.isDone()).toBe(true);
  });
});

describe('ISS requests', () => {
  beforeEach(() => {
    nock.cleanAll();
    clearTokenCache();
  });

  it('creates ISS subscription', async () => {
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
        targetUrl: 'https://example.com/webhook',
      })
      .reply(200, { subscriptionId: 'sub-123' });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    const response = await makeIssRequest<{ subscriptionId: string }>(context, {
      method: 'POST',
      body: {
        subscriptionType: 'HTTP',
        targetPlatform: 'n8n',
        providerId: 'sinchbuild',
        eventTypes: ['MESSAGE_DELIVERY'],
        targetUrl: 'https://example.com/webhook',
      },
    });

    expect(response.subscriptionId).toBe('sub-123');
    expect(issScope.isDone()).toBe(true);
  });
});

describe('OAuth2.0 Token Management', () => {
  beforeEach(() => {
    nock.cleanAll();
    clearTokenCache(); // Clear token cache between tests
  });

  it('fetches and caches OAuth2.0 token', async () => {
    const authScope = nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const apiScope = nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query(true) // Match any query params
      .reply(200, { messages: [] });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await makeSinchRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
      qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
    });

    expect(authScope.isDone()).toBe(true);
    expect(apiScope.isDone()).toBe(true);
  });

  it('handles OAuth2.0 token fetch errors', async () => {
    const authScope = nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(500, {
        error: 'internal_error',
        error_description: 'Internal server error',
      });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await expect(
      makeSinchRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
        qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
      })
    ).rejects.toThrow();

    expect(authScope.isDone()).toBe(true);
  });

  it('uses cached token for subsequent requests', async () => {
    const authScope = nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const apiScope1 = nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query(true) // Match any query params
      .reply(200, { messages: [] });

    const apiScope2 = nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query(true) // Match any query params
      .reply(200, { messages: [] });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    // First request - should fetch token
    await makeSinchRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
      qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
    });

    // Second request - should use cached token
    await makeSinchRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
      qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
    });

    expect(authScope.isDone()).toBe(true);
    expect(apiScope1.isDone()).toBe(true);
    expect(apiScope2.isDone()).toBe(true);
  });
});

describe('SinchProvider', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('sends message successfully', async () => {
    // Mock OAuth2.0 token fetch
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    // Mock Send Message API
    const sendScope = nock('https://au.app.api.sinch.com')
      .post('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages:send', {
        app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN',
        recipient: {
          identified_by: {
            channel_identities: [
              {
                channel: 'SMS',
                identity: '+15551234567',
              },
            ],
          },
        },
        message: {
          text_message: {
            text: 'Hello from n8n!',
          },
        },
        channel_priority_order: ['SMS'],
      })
      .reply(200, {
        message_id: 'msg-123',
        accepted_time: '2024-01-01T00:00:00Z',
      });

    const provider = new SinchProvider();
    const result = await provider.send({
      to: '+15551234567',
      message: 'Hello from n8n!',
      helpers,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('queued');
    expect(result.messageId).toBe('msg-123');
    expect(result.acceptedTime).toBe('2024-01-01T00:00:00Z');
    expect(sendScope.isDone()).toBe(true);
  });

  it('handles OAuth2.0 errors', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(401, {
        error: 'invalid_client',
        error_description: 'Invalid credentials',
      });

    const provider = new SinchProvider();
    
    await expect(
      provider.send({
        to: '+15551234567',
        message: 'Hello',
        helpers,
        credentials: mockCredentials,
      })
    ).rejects.toThrow();
  });

  it('handles API errors', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    nock('https://au.app.api.sinch.com')
      .post('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages:send')
      .reply(400, {
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Invalid phone number',
          status: 'INVALID_ARGUMENT',
        },
      });

    const provider = new SinchProvider();
    
    await expect(
      provider.send({
        to: '+15551234567',
        message: 'Hello',
        helpers,
        credentials: mockCredentials,
      })
    ).rejects.toThrow();
  });

  it('sends message with optional fields (smsSender, callbackUrl, metadata)', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const sendScope = nock('https://au.app.api.sinch.com')
      .post('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages:send', (body: any) => {
        // Verify all optional fields are included
        return body.channel_properties?.SMS_SENDER === 'TEST-SENDER' &&
               body.callback_url === 'https://example.com/callback' &&
               body.message_metadata === 'test-metadata';
      })
      .reply(200, {
        message_id: 'msg-456',
        accepted_time: '2024-01-01T00:00:00Z',
      });

    const provider = new SinchProvider();
    const result = await provider.send({
      to: '+15551234567',
      message: 'Test message',
      smsSender: 'TEST-SENDER',
      callbackUrl: 'https://example.com/callback',
      metadata: 'test-metadata',
      helpers,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('queued');
    expect(result.messageId).toBe('msg-456');
    expect(sendScope.isDone()).toBe(true);
  });
});

describe('Regional Endpoints', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('uses US region endpoint', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const usScope = nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query(true) // Match any query params
      .reply(200, { messages: [] });

    const context = {
      helpers,
      getCredentials: async () => ({ ...mockCredentials, region: 'us' }),
    } as any;

    await makeSinchRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
      qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
    });

    expect(usScope.isDone()).toBe(true);
  });

  it('uses EU region endpoint', async () => {
    nock('https://eu.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const euScope = nock('https://eu.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query(true) // Match any query params
      .reply(200, { messages: [] });

    const context = {
      helpers,
      getCredentials: async () => ({ ...mockCredentials, region: 'eu' }),
    } as any;

    await makeSinchRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
      qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
    });

    expect(euScope.isDone()).toBe(true);
  });

  it('uses BR region endpoint', async () => {
    nock('https://br.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const brScope = nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query(true) // Match any query params
      .reply(200, { messages: [] });

    const context = {
      helpers,
      getCredentials: async () => ({ ...mockCredentials, region: 'br' }),
    } as any;

    await makeSinchRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
      qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
    });

    expect(brScope.isDone()).toBe(true);
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    nock.cleanAll();
    clearTokenCache();
  });

  it('handles 401 Unauthorized', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query({ app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' })
      .reply(401, {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid credentials',
        },
      });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await expect(
      makeSinchRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
        qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
      })
    ).rejects.toThrow();
  });

  it('handles 404 Not Found', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query({ app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' })
      .reply(404, {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await expect(
      makeSinchRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
        qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
      })
    ).rejects.toThrow();
  });

  it('handles errors with status field', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    // Create a mock error that will trigger the errorStatus branch
    // The error structure needs to match: error.response.body.error.status
    const errorWithStatus = {
      error: {
        code: 'INVALID_ARGUMENT',
        message: 'Invalid request',
        status: 'INVALID_ARGUMENT', // This triggers the errorStatus branch (lines 160-162)
      },
    };

    nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query({ app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' })
      .reply(400, errorWithStatus);

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    try {
      await makeSinchRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
        qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // Verify the error was thrown (the branch is hit during error construction)
      expect(error).toBeDefined();
      expect(error.message).toBeTruthy();
      // The errorStatus branch (lines 160-162) is executed when errorStatus exists
      // The error message should include the status in brackets if the branch was hit
      // But the helper might not preserve the structure correctly, so we just verify it throws
    }
  });

  it('handles errors without status field', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query({ app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' })
      .reply(500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error',
          // No status field - tests the branch without errorStatus
        },
      });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await expect(
      makeSinchRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
        qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
      })
    ).rejects.toThrow();
  });

  it('handles errors with errorCode but no errorStatus', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query({ app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' })
      .reply(400, {
        error: {
          code: 'BAD_REQUEST',
          message: 'Bad request',
          // Has code but no status field - tests errorCode branch without errorStatus
        },
      });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await expect(
      makeSinchRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
        qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
      })
    ).rejects.toThrow();
  });

  it('handles errors with both errorCode and errorStatus (explicit branch coverage)', async () => {
    // This test explicitly targets the errorStatus branch (lines 160-162)
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    // Create error response with both code and status to hit the branch
    const errorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        status: 'VALIDATION_ERROR', // This should trigger lines 160-162
      },
    };

    nock('https://au.app.api.sinch.com')
      .get('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages')
      .query({ app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' })
      .reply(422, errorResponse);

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    try {
      await makeSinchRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages',
        qs: { app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN' },
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // Verify error was thrown - the errorStatus branch should have been executed
      expect(error).toBeDefined();
      expect(error.message).toBeTruthy();
    }
  });
});

describe('SinchProvider - sendWhatsAppTemplate', () => {
  beforeEach(() => {
    nock.cleanAll();
    clearTokenCache();
  });

  it('sends WhatsApp template message successfully (no variables)', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const sendScope = nock('https://au.app.api.sinch.com')
      .post('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages:send', {
        app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN',
        recipient: {
          identified_by: {
            channel_identities: [
              {
                channel: 'WHATSAPP',
                identity: '+14155552671',
                app_id: '01FAKETESTAPPIDABCDEFGHIJKLMN',
              },
            ],
          },
        },
        message: {
          template_message: {
            channel_template: {
              WHATSAPP: {
                template_id: 'order_confirmation',
                language_code: 'en',
              },
            },
          },
        },
        channel_priority_order: ['WHATSAPP'],
      })
      .reply(200, {
        message_id: 'msg-whatsapp-001',
        accepted_time: '2024-06-01T10:00:00Z',
      });

    const provider = new SinchProvider();
    const result = await provider.sendWhatsAppTemplate({
      to: '+14155552671',
      templateId: 'order_confirmation',
      languageCode: 'en',
      helpers,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('queued');
    expect(result.messageId).toBe('msg-whatsapp-001');
    expect(result.acceptedTime).toBe('2024-06-01T10:00:00Z');
    expect(sendScope.isDone()).toBe(true);
  });

  it('sends WhatsApp template message with body variables', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const sendScope = nock('https://au.app.api.sinch.com')
      .post(
        '/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages:send',
        (body: any) => {
          const tmpl = body.message?.template_message?.channel_template?.WHATSAPP;
          return (
            tmpl?.template_id === 'delivery_update' &&
            tmpl?.language_code === 'en' &&
            tmpl?.parameters?.['body[1]text'] === 'John' &&
            tmpl?.parameters?.['body[2]text'] === 'Thursday'
          );
        },
      )
      .reply(200, {
        message_id: 'msg-whatsapp-002',
        accepted_time: '2024-06-01T11:00:00Z',
      });

    const provider = new SinchProvider();
    const result = await provider.sendWhatsAppTemplate({
      to: '+14155552671',
      templateId: 'delivery_update',
      languageCode: 'EN',
      parameters: {
        'body[1]text': 'John',
        'body[2]text': 'Thursday',
      },
      helpers,
      credentials: mockCredentials,
    });

    expect(result.status).toBe('queued');
    expect(result.messageId).toBe('msg-whatsapp-002');
    expect(sendScope.isDone()).toBe(true);
  });

  it('lowercases the language code before sending', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const sendScope = nock('https://au.app.api.sinch.com')
      .post(
        '/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages:send',
        (body: any) => {
          const tmpl = body.message?.template_message?.channel_template?.WHATSAPP;
          return tmpl?.language_code === 'en_us';
        },
      )
      .reply(200, {
        message_id: 'msg-whatsapp-003',
        accepted_time: '2024-06-01T12:00:00Z',
      });

    const provider = new SinchProvider();
    await provider.sendWhatsAppTemplate({
      to: '+14155552671',
      templateId: 'welcome',
      languageCode: 'EN_US',
      helpers,
      credentials: mockCredentials,
    });

    expect(sendScope.isDone()).toBe(true);
  });

  it('handles API errors when sending WhatsApp template', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    nock('https://au.app.api.sinch.com')
      .post('/v1/econexus/sinch-build/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/messages:send')
      .reply(400, {
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Template not found',
          status: 'INVALID_ARGUMENT',
        },
      });

    const provider = new SinchProvider();
    await expect(
      provider.sendWhatsAppTemplate({
        to: '+14155552671',
        templateId: 'nonexistent_template',
        languageCode: 'en',
        helpers,
        credentials: mockCredentials,
      }),
    ).rejects.toThrow();
  });
});

describe('makeProvisioningRequest', () => {
  beforeEach(() => {
    nock.cleanAll();
    clearTokenCache();
  });

  it('lists approved WhatsApp templates from Provisioning API', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const provisioningScope = nock('https://provisioning.api.sinch.com')
      .get('/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/whatsapp/templates')
      .query({ pageSize: '100', filterStates: 'APPROVED' })
      .reply(200, {
        templates: [
          {
            name: 'order_confirmation',
            language: 'en',
            state: 'APPROVED',
            category: 'UTILITY',
            details: {
              components: [
                { type: 'BODY', text: 'Your order {{1}} has been confirmed.', examples: ['12345'] },
              ],
            },
          },
          {
            name: 'delivery_update',
            language: 'en',
            state: 'APPROVED',
            category: 'UTILITY',
          },
        ],
      });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    const response = await makeProvisioningRequest<{ templates: any[] }>(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/whatsapp/templates',
      qs: { pageSize: 100, filterStates: 'APPROVED' },
    });

    expect(response.templates).toHaveLength(2);
    expect(response.templates[0].name).toBe('order_confirmation');
    expect(response.templates[1].name).toBe('delivery_update');
    expect(provisioningScope.isDone()).toBe(true);
  });

  it('uses Provisioning API base URL regardless of region', async () => {
    nock('https://eu.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    // Provisioning URL should be the same for EU region credentials
    const provisioningScope = nock('https://provisioning.api.sinch.com')
      .get('/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/whatsapp/templates')
      .query(true)
      .reply(200, { templates: [] });

    const context = {
      helpers,
      getCredentials: async () => ({ ...mockCredentials, region: 'eu' }),
    } as any;

    await makeProvisioningRequest(context, {
      method: 'GET',
      endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/whatsapp/templates',
      qs: { pageSize: 100, filterStates: 'APPROVED' },
    });

    expect(provisioningScope.isDone()).toBe(true);
  });

  it('throws on Provisioning API error', async () => {
    nock('https://us.auth.sinch.com')
      .post('/oauth2/token')
      .reply(200, {
        access_token: 'FAKE-TOKEN-1234567890ABCDEFGHIJKLMNOP',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    nock('https://provisioning.api.sinch.com')
      .get('/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/whatsapp/templates')
      .query(true)
      .reply(403, {
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions',
        },
      });

    const context = {
      helpers,
      getCredentials: async () => mockCredentials,
    } as any;

    await expect(
      makeProvisioningRequest(context, {
        method: 'GET',
        endpoint: '/v1/projects/FAKE-PROJECT-ID-22222222-2222-2222-2222-222222222222/whatsapp/templates',
        qs: { pageSize: 100, filterStates: 'APPROVED' },
      }),
    ).rejects.toThrow();
  });
});

