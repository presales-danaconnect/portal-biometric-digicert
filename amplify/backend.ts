import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { livenessHandler } from './functions/liveness-handler/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  livenessHandler,
});

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
