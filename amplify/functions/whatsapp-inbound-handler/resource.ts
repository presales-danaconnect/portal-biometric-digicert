import { defineFunction } from '@aws-amplify/backend';

export const whatsappInboundHandler = defineFunction({
  name: 'whatsapp-inbound-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 20,
});
