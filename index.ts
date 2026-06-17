import { Sinch } from './nodes/Sinch/Sinch.node';
import { SinchTrigger } from './nodes/Sinch/SinchTrigger.node';
import { SinchApi } from './credentials/SinchApi.credentials';

export default {
  nodes: [Sinch, SinchTrigger],
  credentials: [SinchApi],
};


