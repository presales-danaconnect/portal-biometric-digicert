import { defineFunction } from '@aws-amplify/backend';

export const dataVerificationHandler = defineFunction({
  name: 'data-verification-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
});
