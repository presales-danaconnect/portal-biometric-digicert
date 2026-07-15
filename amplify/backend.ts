import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { ocrHandler } from './functions/ocr-handler/resource';
import { livenessHandler } from './functions/liveness-handler/resource';
import { compareFacesHandler } from './functions/compare-faces-handler/resource';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  ocrHandler,
  livenessHandler,
  compareFacesHandler,
});

// Production domain for CORS, read from environment — change it in
// Amplify Console → App settings → Environment variables (PRODUCTION_ORIGIN)
// without touching any code. Falls back to the current domain for local
// sandbox runs where that variable isn't set.
const PRODUCTION_ORIGIN = process.env.PRODUCTION_ORIGIN || 'https://main.d21x455s6ork0e.amplifyapp.com';

backend.ocrHandler.addEnvironment('PRODUCTION_ORIGIN', PRODUCTION_ORIGIN);
backend.livenessHandler.addEnvironment('PRODUCTION_ORIGIN', PRODUCTION_ORIGIN);
backend.compareFacesHandler.addEnvironment('PRODUCTION_ORIGIN', PRODUCTION_ORIGIN);

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

// Expose Function URLs in amplify_outputs.json
backend.addOutput({
  custom: {
    ocrApiUrl: ocrFunctionUrl.url,
    livenessApiUrl: livenessFunctionUrl.url,
    compareFacesApiUrl: compareFacesFunctionUrl.url,
  },
});

// See docs/rate-limiting.md for notes on Function URL rate limiting options.
