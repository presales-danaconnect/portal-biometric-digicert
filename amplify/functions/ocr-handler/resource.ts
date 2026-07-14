import { defineFunction } from '@aws-amplify/backend';

/**
 * OCR Handler Function
 * Uses Bedrock (Claude Sonnet) to extract information from ID documents
 */
export const ocrHandler = defineFunction({
  name: 'ocr-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 60,
});
