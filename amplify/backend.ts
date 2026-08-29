import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { livenessHandler } from './functions/liveness-handler/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';

const backend = defineBackend({
  auth,
  livenessHandler,
});

// CORS para Lambda Function URL
const livenessFunction = backend.livenessHandler.resources.lambda;
livenessFunction.addFunctionUrl({
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

// Rekognition permissions
backend.auth.resources.unauthenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      'rekognition:CreateFaceLivenessSession',
      'rekognition:GetFaceLivenessSessionResults',
      'rekognition:StartFaceLivenessSession',
    ],
    resources: ['*'],
  })
);