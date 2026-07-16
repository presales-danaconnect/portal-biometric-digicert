---
inclusion: always
---

# Technical Stack & Architecture

## Stack Overview
- Frontend: React 18 + Vite 7, TypeScript 5.9
- UI library: @aws-amplify/ui-react (Card, Flex, Alert, etc.) + @aws-amplify/ui-react-liveness (FaceLivenessDetector)
- Backend: AWS Amplify Gen 2, three independent Lambdas behind Function URLs (no API Gateway, no GraphQL/AppSync)
- Auth: Amazon Cognito Identity Pool, unauthenticated (guest) access only, no login UI anywhere in the app
- Deployment: AWS Amplify Hosting, CI/CD via amplify.yml

## AWS Services Integration

### Amazon Rekognition
Used for: Face Liveness detection and face comparison
- CreateFaceLivenessSession / GetFaceLivenessSessionResults: liveness challenge + confidence score + reference image (returned directly in the API response, no S3 storage configured)
- CompareFaces: matches the Liveness reference image against a captured document photo
- FaceLivenessDetector (frontend component) talks to Rekognition directly over WebSocket using temporary Cognito guest credentials; it never touches our Lambdas for the live video stream itself

### AWS Bedrock (Claude Sonnet)
Used for two purposes:
- OCR and structured document extraction (ocr-handler): given front/back document images, extracts documentNumber, country, documentType, birthDate, names, expirationDate, gender, nationality
- Document validation (both ocr-handler and compare-faces-handler): before extracting/comparing anything, Bedrock is asked to classify whether a captured photo is actually a valid identity document; if not, the request is rejected with a specific error code instead of returning empty fields

### AWS Amplify Gen 2
- Each Lambda (ocr-handler, liveness-handler, compare-faces-handler) is defined independently via defineFunction(), with its own package.json/dependencies
- Function URLs (authType NONE) expose each Lambda directly; CORS is handled per-handler via a shared amplify/functions/shared/cors.ts
- IAM permissions are scoped per-function in backend.ts (e.g. only compare-faces-handler gets both bedrock:InvokeModel and rekognition:CompareFaces)
- No AppSync, no DynamoDB, no GraphQL anywhere in this project

## Technical Constraints & Decisions

### Tenant Configuration
- Current state: tenant config (branding, colors, thresholds, webhookUrl) lives in a committed JSON file (src/config/tenants.json), not environment variables and not a database
- Future consideration: move to a database if the number of tenants or frequency of changes grows enough to make redeploys impractical

### Security Restrictions
1. Tenant naming: avoid predictable identifiers like "company_id" in the URL
2. Webhook delivery happens server-to-server from each Lambda, never from the browser, both to avoid CORS issues with tenant webhooks and to avoid exposing webhook URLs client-side
3. CORS allow-list is environment-driven (PRODUCTION_ORIGIN), not hardcoded per handler
4. Webhook signature verification is not implemented yet; tenants receive unsigned POST requests

### Performance
- AutoCamera auto-captures after a configurable number of seconds (no manual shutter button)
- Images are sent as base64 JPEG, capped at 5MB per image at the Lambda level
- Bedrock document validation runs before the (slower) full OCR extraction or Rekognition CompareFaces call, so invalid documents fail fast

### Internationalization
- Implemented: src/i18n/en.json and es.json, selected via ?lang= URL param, covering all app UI strings
- FaceLivenessDetector's own built-in strings are translated separately via src/i18n/livenessDictionary.ts, since that component has its own displayText prop schema unrelated to our i18n keys

### Development Guidelines
1. Full TypeScript across frontend and all three Lambdas
2. Every new Lambda function needs its own package.json, a local npm install, and a matching line in amplify.yml's backend.phases.build.commands, or production builds fail even though local sandbox runs work
3. CloudWatch logging with source IP is implemented in each handler for audit purposes
4. No automated test suite exists yet

## Known Gaps / Future Roadmap
1. Move tenant config from a committed JSON file to a database (DynamoDB or similar), to allow adding/editing tenants without a redeploy
2. Webhook signature verification, so tenants can validate requests actually came from this system
3. Rate limiting on Lambda Function URLs (see docs/rate-limiting.md for options; nothing implemented yet)
4. Automated testing (unit + integration)
