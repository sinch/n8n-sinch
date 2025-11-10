import type {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SinchBuildConversationsApi implements ICredentialType {
  name = 'SinchBuildConversationsApi';
  displayName = 'Sinch Build Conversations API';
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

  // Test the credentials by making a simple API call
  // Note: This test uses Basic Auth for simplicity, but the actual node implementation
  // uses OAuth2.0 (handled manually in sinchBuildConversationsHttp.ts)
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.region ? `https://${$credentials.region}.conversation.api.sinch.com` : "https://us.conversation.api.sinch.com"}}',
      url: '/v1/projects/={{$credentials.projectId}}/apps/={{$credentials.appId}}',
      method: 'GET',
      auth: {
        username: '={{$credentials.keyId}}',
        password: '={{$credentials.keySecret}}',
      },
    },
  };
}

