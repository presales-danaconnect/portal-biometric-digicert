import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { livenessHandler } from './functions/liveness-handler/resource';

const backend = defineBackend({
  auth,
  livenessHandler,
});

// Grant unauthenticated role permissions for Rekognition Liveness
backend.auth.resources.unauthenticatedUserIamRole.addManagedPolicy({
  managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonRekognitionReadOnlyAccess',
});

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

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
