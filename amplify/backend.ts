import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { livenessHandler } from './functions/liveness-handler/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';

const backend = defineBackend({
  auth,
  livenessHandler,
});

// Permisos Rekognition para la Lambda
backend.livenessHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'rekognition:CreateFaceLivenessSession',
      'rekognition:GetFaceLivenessSessionResults',
    ],
    resources: ['*'],
  })
);

// Lambda Function URL con CORS
const livenessFunction = backend.livenessHandler.resources.lambda;
const functionUrl = livenessFunction.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: [
      'http://localhost:5173',
      process.env.PRODUCTION_ORIGIN || 'https://main.d1lkp0qzhr01kq.amplifyapp.com',
    ],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

// Exponer URL en amplify_outputs.json
backend.addOutput({
  custom: {
    livenessApiUrl: functionUrl.url,
  },
});

// Permisos Rekognition para rol unauthenticated (frontend)
backend.auth.resources.unauthenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      'rekognition:StartFaceLivenessSession',
    ],
    resources: ['*'],
  })
);