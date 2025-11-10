import { SinchBuildConversations } from './nodes/SinchBuildConversations/SinchBuildConversations.node';
import { SinchBuildConversationsApi } from './credentials/SinchBuildConversationsApi.credentials';

export default {
  nodes: [SinchBuildConversations],
  credentials: [SinchBuildConversationsApi],
};


