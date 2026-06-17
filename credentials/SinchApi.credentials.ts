import type {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';
import { version as connectorVersion } from '../package.json';

export class SinchApi implements ICredentialType {
  name = 'sinchApi';
  displayName = 'Sinch API';
  documentationUrl = 'https://developers.sinch.com/docs/conversation/';
  icon = 'file:sinch.svg' as const;

  properties: INodeProperties[] = [
    {
      displayName: 'Key ID',
      name: 'keyId',
      type: 'string',
      typeOptions: { password: true },
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
    {
      displayName: 'Project ID',
      name: 'projectId',
      type: 'string',
      default: '',
      required: true,
      description: 'Your Sinch Project ID from the dashboard',
      placeholder: 'e.g., 00000000-0000-0000-0000-000000000000',
    },
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

  // Validate credentials via the Econexus Sinch Build proxy
  test: ICredentialTestRequest = {
    request: {
      method: 'GET',
      url: '={{ $credentials.region === "eu" ? "https://eu.app.api.sinch.com" : "https://au.app.api.sinch.com" }}/v1/econexus/sinch-build/v1/projects/{{ $credentials.projectId }}/apps',
      qs: {
        isTestingAuth: 'true',
      },
      auth: {
        username: '={{$credentials.keyId}}',
        password: '={{$credentials.keySecret}}',
      },
      headers: {
        'Accept': 'application/json',
        'X-AUTH-SOURCE': 'SINCH-BUILD',
        'X-SINCH-APP-ID': '={{$credentials.appId}}',
        'X-SINCH-PROJECT-ID': '={{$credentials.projectId}}',
        'X-CLIENT-SOURCE': 'n8n-sinch-build',
        'X-CLIENT-SOURCE-VERSION': connectorVersion,
      },
    },
  };
}
