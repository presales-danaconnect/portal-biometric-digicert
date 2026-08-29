import { defineFunction, secret } from '@aws-amplify/backend';

export const livenessHandler = defineFunction({
  name: 'liveness-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  environment: {
    PRODUCTION_ORIGIN: process.env.PRODUCTION_ORIGIN || 'https://main.d1lkp0qzhr01kq.amplifyapp.com',
  },
});
