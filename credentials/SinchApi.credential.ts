import type {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SinchApi implements ICredentialType {
  name = 'SinchApi';
  displayName = 'Sinch API';
  documentationUrl = 'https://developers.sinch.com/docs/conversation/';
  
  properties: INodeProperties[] = [
    {
      displayName: 'Key ID',
      name: 'keyId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Sinch API Key ID from the dashboard',
    },
    {
      displayName: 'Key Secret',
      name: 'keySecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Sinch API Key Secret from the dashboard',
    },
    // Region Selection
    {
      displayName: 'Region',
      name: 'region',
      type: 'options',
      options: [
        { name: 'US', value: 'us' },
        { name: 'EU', value: 'eu' },
        { name: 'BR', value: 'br' },
      ],
      default: 'us',
      required: true,
      description: 'Region where your Conversation API app was created',
    },
    // Project ID
    {
      displayName: 'Project ID',
      name: 'projectId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Sinch Project ID from the dashboard',
      placeholder: 'e.g., 00000000-0000-0000-0000-000000000000',
    },
    // App ID (used in messages)
    {
      displayName: 'App ID',
      name: 'appId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Sinch Conversation API App ID',
      placeholder: 'e.g., 01AAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  ];

  // Test the credentials by attempting to obtain an OAuth2.0 access token
  // This validates that the Key ID and Key Secret are correct
  test: ICredentialTestRequest = {
    request: {
      method: 'POST',
      url: 'https://auth.sinch.com/oauth2/token',
      body: 'grant_type=client_credentials',
      auth: {
        username: '={{$credentials.keyId}}',
        password: '={{$credentials.keySecret}}',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  };
}

