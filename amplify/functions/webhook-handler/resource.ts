import { defineFunction } from '@aws-amplify/backend';

export const webhookHandler = defineFunction({
  name: 'webhook-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 20,
});
