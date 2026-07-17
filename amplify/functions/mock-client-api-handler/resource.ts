import { defineFunction } from '@aws-amplify/backend';

export const mockClientApiHandler = defineFunction({
  name: 'mock-client-api-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 15,
});
