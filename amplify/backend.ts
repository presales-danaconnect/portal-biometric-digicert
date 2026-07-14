import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { ocrHandler } from './functions/ocr-handler/resource';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  ocrHandler,
});

// Create Function URL for OCR Handler
const ocrFunctionUrl = backend.ocrHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Grant Bedrock InvokeModel permission
backend.ocrHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: [
      'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0',
      'arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    ],
  })
);

// Expose Function URL in amplify_outputs.json
backend.addOutput({
  custom: {
    ocrApiUrl: ocrFunctionUrl.url,
  },
});

/*
 * RATE LIMITING NOTE (IMPORTANT):
 * 
 * Amplify Gen 2's `defineFunction` creates a Lambda with Function URL (not API Gateway).
 * For production rate limiting with Usage Plans and API Keys, you have these options:
 * 
 * OPTION 1: Use AWS WAF with Lambda Function URL (RECOMMENDED)
 *   - Deploy WAF with rate limiting rules
 *   - Associate WAF with the Function URL
 *   - AWS WAF supports:
 *     - Rate-based rules (e.g., 100 requests per 5 minutes)
 *     - Managed rules for common attacks
 *     - Custom rule matching
 * 
 * OPTION 2: Use API Gateway instead of Function URL
 *   - Create REST API with API Gateway
 *   - Configure Usage Plans with rate/quota limits
 *   - More control but more complex setup
 * 
 * OPTION 3: Use Amplify Console settings
 *   - Configure protection features in Amplify Console
 *   - Basic throttling available in hosting settings
 * 
 * Current protections implemented:
 * - Reserved concurrency: 5 concurrent executions (resource.ts)
 * - Payload size limit: 5MB per image (handler.ts)
 * - CloudWatch logging with source IP for audit (handler.ts)
 * - Token validation hook ready for future API key auth (handler.ts)
 * 
 * To add AWS WAF rate limiting:
 * 1. Deploy the function first: npx amplify sandbox push
 * 2. Go to AWS Console > WAF > Create web ACL
 * 3. Associate with the Lambda Function URL
 * 4. Add rate-based rule: 100 requests per 5 minutes per IP
 */
