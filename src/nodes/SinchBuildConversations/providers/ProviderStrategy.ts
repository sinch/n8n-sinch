import type { ProviderSendParams, ProviderSendResult } from '../types';

export interface ProviderStrategy {
  send(params: ProviderSendParams): Promise<ProviderSendResult>;
}


