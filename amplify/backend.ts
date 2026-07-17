import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { ocrHandler } from './functions/ocr-handler/resource';
import { livenessHandler } from './functions/liveness-handler/resource';
import { compareFacesHandler } from './functions/compare-faces-handler/resource';
import { mockClientApiHandler } from './functions/mock-client-api-handler/resource';
import { dataVerificationHandler } from './functions/data-verification-handler/resource';
import { whatsappInboundHandler } from './functions/whatsapp-inbound-handler/resource';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  ocrHandler,
  livenessHandler,
  compareFacesHandler,
  mockClientApiHandler,
  dataVerificationHandler,
  whatsappInboundHandler,
});

// Production domain for CORS, read from environment — change it in
// Amplify Console → App settings → Environment variables (PRODUCTION_ORIGIN)
// without touching any code. Falls back to the current domain for local
// sandbox runs where that variable isn't set.
const PRODUCTION_ORIGIN = process.env.PRODUCTION_ORIGIN || 'https://main.d21x455s6ork0e.amplifyapp.com';

backend.ocrHandler.addEnvironment('PRODUCTION_ORIGIN', PRODUCTION_ORIGIN);
backend.livenessHandler.addEnvironment('PRODUCTION_ORIGIN', PRODUCTION_ORIGIN);
backend.compareFacesHandler.addEnvironment('PRODUCTION_ORIGIN', PRODUCTION_ORIGIN);
backend.dataVerificationHandler.addEnvironment('PRODUCTION_ORIGIN', PRODUCTION_ORIGIN);

const BEDROCK_MODEL_RESOURCES = [
  'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0',
  'arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0',
];

// Create Function URL for OCR Handler
const ocrFunctionUrl = backend.ocrHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Grant Bedrock InvokeModel permission
backend.ocrHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: BEDROCK_MODEL_RESOURCES,
  })
);

// Create Function URL for Liveness Handler
const livenessFunctionUrl = backend.livenessHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Grant Rekognition permissions to the Liveness Lambda
// (used by our backend to create sessions and fetch results server-to-server)
backend.livenessHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'rekognition:CreateFaceLivenessSession',
      'rekognition:GetFaceLivenessSessionResults',
    ],
    resources: ['*'],
  })
);

// Grant the Cognito unauthenticated (guest) role permission to start a
// Liveness session directly from the browser via WebSocket streaming.
// This is what FaceLivenessDetector uses under the hood — it never
// shows any login UI to the end user, it's purely for signing requests.
backend.auth.resources.unauthenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['rekognition:StartFaceLivenessSession'],
    resources: ['*'],
  })
);

// Create Function URL for Compare Faces Handler
const compareFacesFunctionUrl = backend.compareFacesHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Grant Rekognition permissions to the Compare Faces Lambda
// (fetches the Liveness reference image and compares it against the document photo)
backend.compareFacesHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'rekognition:GetFaceLivenessSessionResults',
      'rekognition:CompareFaces',
    ],
    resources: ['*'],
  })
);

// Grant Bedrock InvokeModel permission to the Compare Faces Lambda
// (used to validate the document photo is a real identity document before
// spending a Rekognition CompareFaces call on it)
backend.compareFacesHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: BEDROCK_MODEL_RESOURCES,
  })
);

// Create Function URL for the Mock Client API Handler
// (no special IAM permissions needed — it doesn't call Bedrock or Rekognition)
const mockClientApiFunctionUrl = backend.mockClientApiHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Create Function URL for the Data Verification Handler
const dataVerificationFunctionUrl = backend.dataVerificationHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Grant Bedrock InvokeModel permission to the Data Verification Lambda
// (used both to extract document data and to semantically compare it
// against the tenant's external API response)
backend.dataVerificationHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: BEDROCK_MODEL_RESOURCES,
  })
);

// Create Function URL for the WhatsApp Inbound Handler
// (receives forwarded WhatsApp messages from the external router Lambda)
const whatsappInboundFunctionUrl = backend.whatsappInboundHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Configuration for the WhatsApp inbound flow. Credentials come from
// environment variables — set them locally before running `npx ampx sandbox`
// (e.g. `export WHATSAPP_ACCESS_TOKEN=...`) and in Amplify Console →
// Environment variables for production. Never hardcode tokens here.
backend.whatsappInboundHandler.addEnvironment('MOCK_CLIENT_API_URL', mockClientApiFunctionUrl.url);
backend.whatsappInboundHandler.addEnvironment('VERIFICATION_BASE_URL', PRODUCTION_ORIGIN);
backend.whatsappInboundHandler.addEnvironment('DEFAULT_TENANT', process.env.DEFAULT_TENANT || 'demo');
backend.whatsappInboundHandler.addEnvironment('WHATSAPP_ACCESS_TOKEN', process.env.WHATSAPP_ACCESS_TOKEN || '');
backend.whatsappInboundHandler.addEnvironment('WHATSAPP_PHONE_NUMBER_ID', process.env.WHATSAPP_PHONE_NUMBER_ID || '');

// Expose Function URLs in amplify_outputs.json
backend.addOutput({
  custom: {
    ocrApiUrl: ocrFunctionUrl.url,
    livenessApiUrl: livenessFunctionUrl.url,
    compareFacesApiUrl: compareFacesFunctionUrl.url,
    mockClientApiUrl: mockClientApiFunctionUrl.url,
    dataVerificationHandlerUrl: dataVerificationFunctionUrl.url,
    whatsappInboundHandlerUrl: whatsappInboundFunctionUrl.url,
  },
});

// See docs/rate-limiting.md for notes on Function URL rate limiting options.
