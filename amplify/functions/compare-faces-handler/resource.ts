import { defineFunction } from '@aws-amplify/backend';

/**
 * Compare Faces Handler Function
 * Compares a document photo against the reference image from a
 * completed Face Liveness session, using Amazon Rekognition.
 */
export const compareFacesHandler = defineFunction({
  name: 'compare-faces-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
});
