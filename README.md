# Identity Verification SDK

A multi-tenant identity verification platform that businesses embed via URL to run document OCR, face liveness detection, face comparison, and external data verification checks, powered by AWS Bedrock and AWS Rekognition. Results are delivered asynchronously to each client's webhook.

## How it works

A business embeds a URL in their app:

https://your-domain.com/verify?service={service}&tenant={tenant_id}&lang={lang}&docRef={docRef}

- service: which verification to run: ocr, liveness, compare-faces, or data-verification
- tenant: client identifier; resolves branding, colors, thresholds, and webhook URL from src/config/tenants.json
- lang: en or es (defaults to en)
- docRef: only for data-verification — a trusted document number/reference the tenant already knows about the user (e.g. from their own system or a WhatsApp conversation), used to query their external API

After a check completes, the backend notifies the tenant's configured webhook server-to-server with the result. The browser never talks to the client's webhook directly, which avoids CORS issues and keeps webhook URLs private.

## Services

| Service | AWS Service | What it does |
|---|---|---|
| ocr | Bedrock (Claude Sonnet) | Captures front (and optionally back) of an ID document, validates it is a real identity document, extracts structured data (name, DOB, document number, etc.) |
| liveness | Rekognition Face Liveness | Runs a live face-liveness challenge, returns a confidence score against the tenant's configured threshold |
| compare-faces | Bedrock + Rekognition | Captures an ID photo, validates it is a real document, runs Liveness, then compares the document photo against the Liveness reference image |
| data-verification | Bedrock + external tenant API | Extracts document data via OCR, queries the tenant's external identity-lookup API using the trusted docRef, then uses Bedrock to semantically compare both datasets (tolerating formatting differences, catching real mismatches) |

All services notify the tenant's webhook with a consistent payload shape (JSON):

    tenant: "1"
    service: "ocr"
    timestamp: "2026-07-15T10:00:00.000Z"
    geolocation: "Bogota, Colombia"
    data: { ...service-specific result... }

## Back-document capture

Not all identity documents have a back side with data (passports, some national IDs). Each tenant can set requiresBackDocument in tenants.json:

- true: the ocr and data-verification flows capture front and back, and Bedrock validates/extracts from both
- false (default when omitted): only the front is captured; the submit button appears immediately after the front photo instead of showing an extra "Continue" step

compare-faces and liveness are unaffected by this setting, since they never capture a back side.

## Architecture

- Frontend: React + Vite, deployed via AWS Amplify Hosting
- Backend: AWS Amplify Gen 2, each service is its own Lambda behind a Function URL (no API Gateway)
  - amplify/functions/ocr-handler/ : Bedrock OCR + document validation (uses shared/documentExtractor.ts)
  - amplify/functions/liveness-handler/ : creates/resolves Rekognition Face Liveness sessions
  - amplify/functions/compare-faces-handler/ : document validation + Rekognition CompareFaces
  - amplify/functions/data-verification-handler/ : document extraction (shared logic) + external API lookup + Bedrock semantic comparison
  - amplify/functions/mock-client-api-handler/ : reference implementation of the external identity-lookup API contract, used by the demo tenant and as a live example for real tenants building their own compatible endpoint
  - amplify/functions/shared/ : code shared across handlers
    - cors.ts : CORS headers, reads PRODUCTION_ORIGIN env var
    - webhookNotifier.ts : POSTs results to the tenant's webhook
    - documentExtractor.ts : Bedrock document validation + field extraction, shared by ocr-handler and data-verification-handler so both stay in sync on prompt/parsing logic
- Auth: Cognito Identity Pool with unauthenticated (guest) access enabled, required by FaceLivenessDetector to sign WebSocket requests to Rekognition. End users never see any login UI.
- Tenants: configured in src/config/tenants.json (branding, colors, thresholds, webhookUrl, requiresBackDocument, dataVerificationApiUrl). No database; adding or editing a tenant today requires a code change and redeploy.
- i18n: src/i18n/en.json and es.json, selected via the ?lang= URL param.

### External API contract for data-verification

A tenant's dataVerificationApiUrl must respond to:

    GET {url}?documentNumber=X

    200 -> { "found": true, "firstName": "...", "lastName": "...", "documentNumber": "...", "birthDate": "YYYY-MM-DD" }
    200 -> { "found": false }

See amplify/functions/mock-client-api-handler/ for a working reference implementation.

## Local development

    npm install
    npx ampx sandbox      # deploys your own isolated backend to AWS, watches for changes
    npm run dev           # in a second terminal

npx ampx sandbox writes amplify_outputs.json with your sandbox's real Function URLs. Copy them into .env:

    VITE_OCR_API_ENDPOINT=<ocrApiUrl from amplify_outputs.json>
    VITE_LIVENESS_API_ENDPOINT=<livenessApiUrl from amplify_outputs.json>
    VITE_COMPARE_FACES_API_ENDPOINT=<compareFacesApiUrl from amplify_outputs.json>
    VITE_MOCK_CLIENT_API_ENDPOINT=<mockClientApiUrl from amplify_outputs.json>
    VITE_DATA_VERIFICATION_API_ENDPOINT=<dataVerificationHandlerUrl from amplify_outputs.json>

## Adding a new Lambda function

Each function needs its own package.json with dependencies installed locally (run npm install inside the function's folder), and a corresponding line in amplify.yml under backend.phases.build.commands:

    npm ci --cache .npm --prefer-offline --prefix amplify/functions/<your-function>

Skipping this causes production builds to fail with "Cannot find module '@aws-sdk/...'" even though it works locally. This also applies to amplify/functions/shared/, since it has its own package.json for dependencies used by code imported across handlers (e.g. @aws-sdk/client-bedrock-runtime for documentExtractor.ts).

## Deploying to production

Pushing to main triggers Amplify Hosting's pipeline (amplify.yml), which deploys the backend (npx ampx pipeline-deploy) then builds the frontend.

Required environment variables in Amplify Console under App settings > Environment variables:

| Variable | Used by |
|---|---|
| VITE_OCR_API_ENDPOINT | Frontend, OCR Lambda Function URL |
| VITE_LIVENESS_API_ENDPOINT | Frontend, Liveness Lambda Function URL |
| VITE_COMPARE_FACES_API_ENDPOINT | Frontend, Compare Faces Lambda Function URL |
| VITE_MOCK_CLIENT_API_ENDPOINT | Frontend, Mock Client API Lambda Function URL (used by the demo tenant) |
| VITE_DATA_VERIFICATION_API_ENDPOINT | Frontend, Data Verification Lambda Function URL |
| PRODUCTION_ORIGIN | Backend, CORS allow-list for all Lambdas |

Important: if you change a function's name or entry in its resource.ts, its Function URL is regenerated. Remember to update the corresponding VITE_* variable both in .env and in Amplify Console.

## Known limitations

- Lambda Function URLs have no built-in rate limiting (see docs/rate-limiting.md for mitigation options)
- Tenant config lives in a committed JSON file; adding a tenant requires a code change and redeploy
- No signature verification on outgoing webhooks yet; tenants receive unsigned POST requests
- OCR/data-verification field extraction can occasionally misread specific documents (e.g. date formatting quirks); data-verification's Bedrock-based comparison step helps surface these as mismatches rather than silently returning wrong data

## Roadmap ideas (not yet built)

- Combined KYC flow: OCR + Liveness + Compare Faces in one sequence with a single webhook, reusing the front document photo for both OCR and face comparison
- WhatsApp-friendly flows: an optional reference parameter that passes through untouched to the webhook payload, letting a tenant's WhatsApp bot correlate the result back to the right conversation
- A local admin form (dev-only) to fill out and write tenants.json entries without hand-editing JSON
- Move tenant config to a database, so a future admin form could update it live instead of requiring a commit + redeploy
- API Gateway with per-tenant API keys, or AWS WAF, for production-grade rate limiting and access control

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
