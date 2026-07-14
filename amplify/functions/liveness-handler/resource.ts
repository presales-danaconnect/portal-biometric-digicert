import { defineFunction } from '@aws-amplify/backend';

/**
 * Liveness Handler Function
 * Creates and retrieves Face Liveness sessions via Amazon Rekognition
 */
export const livenessHandler = defineFunction({
  name: 'liveness-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
});
