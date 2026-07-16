# Identity Verification SDK

A multi-tenant identity verification platform that businesses embed via URL to run document OCR, face liveness detection, and face comparison checks, powered by AWS Bedrock and AWS Rekognition. Results are delivered asynchronously to each client's webhook.

## How it works

A business embeds a URL in their app:

https://your-domain.com/verify?service={service}&tenant={tenant_id}&lang={lang}

- service: which verification to run: ocr, liveness, or compare-faces
- tenant: client identifier; resolves branding, colors, thresholds, and webhook URL from src/config/tenants.json
- lang: en or es (defaults to en)

After a check completes, the backend notifies the tenant's configured webhook server-to-server with the result. The browser never talks to the client's webhook directly, which avoids CORS issues and keeps webhook URLs private.

## Services

| Service | AWS Service | What it does |
|---|---|---|
| ocr | Bedrock (Claude Sonnet) | Captures front/back of an ID document, validates it is a real identity document, extracts structured data (name, DOB, document number, etc.) |
| liveness | Rekognition Face Liveness | Runs a live face-liveness challenge, returns a confidence score against the tenant's configured threshold |
| compare-faces | Bedrock + Rekognition | Captures an ID photo, validates it is a real document, runs Liveness, then compares the document photo against the Liveness reference image |

All three notify the tenant's webhook with a consistent payload shape (JSON):

    tenant: "1"
    service: "ocr"
    timestamp: "2026-07-15T10:00:00.000Z"
    geolocation: "Bogota, Colombia"
    data: { ...service-specific result... }

## Architecture

- Frontend: React + Vite, deployed via AWS Amplify Hosting
- Backend: AWS Amplify Gen 2, each service is its own Lambda behind a Function URL (no API Gateway)
  - amplify/functions/ocr-handler/ : Bedrock OCR + document validation
  - amplify/functions/liveness-handler/ : creates/resolves Rekognition Face Liveness sessions
  - amplify/functions/compare-faces-handler/ : document validation + Rekognition CompareFaces
  - amplify/functions/shared/ : code shared across all three Lambdas (CORS config, webhook notifier)
- Auth: Cognito Identity Pool with unauthenticated (guest) access enabled, required by FaceLivenessDetector to sign WebSocket requests to Rekognition. End users never see any login UI.
- Tenants: configured in src/config/tenants.json (branding, colors, thresholds, webhook URL). No database; adding or editing a tenant today requires a code change and redeploy (see Known limitations).
- i18n: src/i18n/en.json and es.json, selected via the ?lang= URL param.

## Local development

    npm install
    npx ampx sandbox      # deploys your own isolated backend to AWS, watches for changes
    npm run dev           # in a second terminal

npx ampx sandbox writes amplify_outputs.json with your sandbox's real Function URLs. Copy them into .env:

    VITE_OCR_API_ENDPOINT=<ocrApiUrl from amplify_outputs.json>
    VITE_LIVENESS_API_ENDPOINT=<livenessApiUrl from amplify_outputs.json>
    VITE_COMPARE_FACES_API_ENDPOINT=<compareFacesApiUrl from amplify_outputs.json>

## Adding a new Lambda function

Each function needs its own package.json with dependencies installed locally (run npm install inside the function's folder), and a corresponding line in amplify.yml under backend.phases.build.commands:

    npm ci --cache .npm --prefer-offline --prefix amplify/functions/<your-function>

Skipping this causes production builds to fail with "Cannot find module '@aws-sdk/...'" even though it works locally.

## Deploying to production

Pushing to main triggers Amplify Hosting's pipeline (amplify.yml), which deploys the backend (npx ampx pipeline-deploy) then builds the frontend.

Required environment variables in Amplify Console under App settings > Environment variables:

| Variable | Used by |
|---|---|
| VITE_OCR_API_ENDPOINT | Frontend, OCR Lambda Function URL |
| VITE_LIVENESS_API_ENDPOINT | Frontend, Liveness Lambda Function URL |
| VITE_COMPARE_FACES_API_ENDPOINT | Frontend, Compare Faces Lambda Function URL |
| PRODUCTION_ORIGIN | Backend, CORS allow-list for all three Lambdas |

Important: if you change a function's name or entry in its resource.ts, its Function URL is regenerated. Remember to update the corresponding VITE_* variable both in .env and in Amplify Console.

## Known limitations

- Lambda Function URLs have no built-in rate limiting (see docs/rate-limiting.md for mitigation options)
- Tenant config lives in a committed JSON file; adding a tenant requires a code change and redeploy

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
