import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import type { SinchCredentials, OAuth2TokenResponse, SinchRegion } from '../nodes/Sinch/types';
import { SinchApiError } from './errors';

// Token cache (in-memory, keyed by credentials)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// Export function to clear token cache for testing
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Get OAuth2.0 access token for Sinch Build Conversations API.
 * Caches tokens until they expire (typically 1 hour).
 * Uses 55-minute cache (5-minute buffer before expiry).
 */
async function getAccessToken(
  context: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  credentials: SinchCredentials,
): Promise<string> {
  // Create cache key
  const cacheKey = `${credentials.keyId}:${credentials.keySecret}`;
  const cached = tokenCache.get(cacheKey);

  // Return cached token if still valid (with 5-minute buffer)
  // This ensures we refresh tokens before they expire
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  // Fetch new token from Sinch auth server
  const http = (context.helpers as any).httpRequest ?? (context.helpers as any).request;

  try {
    // Use form-encoded body as string (like the test script does)
    // This avoids conflicts between 'form' and 'json' properties in n8n's httpRequest
    const formBody = 'grant_type=client_credentials';
    
    const response = await http({
      method: 'POST',
      url: 'https://auth.sinch.com/oauth2/token',
      body: formBody,
      auth: {
        username: credentials.keyId,
        password: credentials.keySecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formBody).toString(),
      },
      json: true, // Parse JSON response
    }) as OAuth2TokenResponse;

    // Cache the token with 55-minute expiry (5-minute buffer before actual expiry)
    // expires_in is typically 3600 seconds (1 hour)
    const tokenExpirySeconds = response.expires_in || 3600;
    const cacheExpirySeconds = Math.max(tokenExpirySeconds - 300, 3300); // 55 minutes minimum
    const expiresAt = Date.now() + (cacheExpirySeconds * 1000);
    
    tokenCache.set(cacheKey, {
      token: response.access_token,
      expiresAt,
    });

    return response.access_token;
  } catch (error: any) {
    throw new SinchApiError(
      `Failed to obtain OAuth2 access token: ${error.message}`,
      error.statusCode,
      'AUTH_FAILED',
      error.response,
    );
  }
}

/**
 * Get the base URL for the Sinch Build Conversations API based on region.
 */
function getBaseUrl(region: SinchRegion): string {
  const baseUrls: Record<SinchRegion, string> = {
    us: 'https://us.conversation.api.sinch.com',
    eu: 'https://eu.conversation.api.sinch.com',
    br: 'https://br.conversation.api.sinch.com',
  };
  return baseUrls[region] || baseUrls.us;
}

/**
 * Make an authenticated request to the Sinch API.
 * Handles OAuth2.0 token management and regional endpoints.
 */
export async function makeSinchRequest<T = any>(
  context: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
  options: {
    method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
    endpoint: string; // e.g., '/v1/projects/{project_id}/messages:send'
    body?: any;
    qs?: Record<string, any>;
  },
): Promise<T> {
  // Get credentials
  const credentials = (await context.getCredentials('SinchApi')) as SinchCredentials;

  // Get OAuth2.0 access token
  const accessToken = await getAccessToken(context, credentials);

  // Build full URL
  const baseUrl = getBaseUrl(credentials.region);
  const url = `${baseUrl}${options.endpoint}`;

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add OAuth2.0 Bearer token authentication
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Make request
  const http = (context.helpers as any).httpRequest ?? (context.helpers as any).request;

  try {
    const response = await http({
      method: options.method,
      url,
      uri: url, // backward compat
      json: true,
      body: options.body,
      qs: options.qs,
      headers,
      timeout: 30000, // 30s timeout for Conversations API
    });

    return response as T;
  } catch (error: any) {
    // Parse Sinch API error format
    const errorResponse = error.response?.body || error.error || error;
    const errorCode = errorResponse?.error?.code || error.statusCode;
    const errorMessage = errorResponse?.error?.message || error.message || 'Unknown error';
    const errorStatus = errorResponse?.error?.status;

    // Build detailed error message
    let detailedMessage = `Sinch Build Conversations API error: ${errorMessage}`;
    if (errorCode) {
      detailedMessage += ` (Status: ${errorCode})`;
    }
    if (errorStatus) {
      detailedMessage += ` [${errorStatus}]`;
    }

    throw new SinchApiError(
      detailedMessage,
      errorCode,
      errorStatus,
      errorResponse,
    );
  }
}

