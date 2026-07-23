# Identity Verification SDK

A multi-tenant identity verification platform that businesses embed via URL to run document OCR, face liveness detection, face comparison, and external data verification checks, powered by AWS Bedrock and AWS Rekognition. Results are delivered asynchronously to each client's webhook, optionally signed with HMAC-SHA256, and optionally correlated back to a WhatsApp conversation.

## How it works

A business embeds a URL in their app:

https://your-domain.com/verify?service={service}&tenant={tenant_id}&lang={lang}&docRef={docRef}&reference={reference}

- service: which verification to run: ocr, liveness, compare-faces, or data-verification
- tenant: client identifier; resolves branding, colors, thresholds, and webhook URL from src/config/tenants.json
- lang: en or es (defaults to en)
- docRef: only for data-verification — a trusted document number/reference the tenant already knows about the user (e.g. from their own system or a WhatsApp conversation), used to query their external API
- reference: optional correlation id (e.g. a WhatsApp phone number) that passes through untouched into the webhook payload, letting the tenant's system route the result back to the right conversation or session

After a check completes, the backend notifies the tenant's configured webhook server-to-server with the result. The browser never talks to the client's webhook directly, which avoids CORS issues and keeps webhook URLs private.

The root path (/) serves a standalone marketing landing page (src/components/marketing/ProductLanding.tsx) with links to all four demo services — it has no functional role in verification itself.

## Services

| Service | AWS Service | What it does |
|---|---|---|
| ocr | Bedrock (Claude Sonnet) | Captures front (and optionally back) of an ID document, validates it is a real identity document, extracts structured data (name, DOB, document number, confidence score, etc.) |
| liveness | Rekognition Face Liveness | Runs a live face-liveness challenge, returns a confidence score against the tenant's configured threshold |
| compare-faces | Bedrock + Rekognition | Captures an ID photo, validates it is a real document, runs Liveness, then compares the document photo against the Liveness reference image |
| data-verification | Bedrock + external tenant API | Extracts document data via OCR, queries the tenant's external identity-lookup API using the trusted docRef, then uses Bedrock to semantically compare both datasets (tolerating formatting differences, catching real mismatches) |

All services notify the tenant's webhook with a consistent payload shape (JSON) — see the Webhook Integration Guide below for the full contract.

## Attempt limits and confidence thresholds

Each tenant can configure, in tenants.json:

- maxVerificationAttempts: how many times a user can retry a failed verification before the UI stops offering a retry button (default 3). A successful verification never shows a retry button, regardless of this limit. Tracked client-side in sessionStorage per tenant+service, so it survives a page reload within the same browser tab but resets when the tab closes.
- ocrConfidenceThreshold: minimum Bedrock-reported confidence (0-100) for an OCR extraction to be treated as successful, rather than flagged as low-confidence
- livenessConfidenceThreshold / compareFacesSimilarityThreshold: same idea, for those services

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
  - amplify/functions/whatsapp-inbound-handler/ : receives forwarded WhatsApp Cloud API messages (from an external router), runs a stateless menu flow, and sends the user a verification link
  - amplify/functions/webhook-handler/ : the default webhookUrl used by demo tenants — logs every result, and additionally replies via WhatsApp when the payload's reference field is present
  - amplify/functions/shared/ : code shared across handlers
    - cors.ts : CORS headers, reads PRODUCTION_ORIGIN env var
    - webhookNotifier.ts : POSTs results to the tenant's webhook, HMAC-signs the payload if WEBHOOK_SIGNING_SECRET is set
    - documentExtractor.ts : Bedrock document validation + field extraction, shared by ocr-handler and data-verification-handler so both stay in sync on prompt/parsing logic
    - whatsapp.ts : sendWhatsAppMessage() helper used by both whatsapp-inbound-handler and webhook-handler
- Auth: Cognito Identity Pool with unauthenticated (guest) access enabled, required by FaceLivenessDetector to sign WebSocket requests to Rekognition. End users never see any login UI.
- Tenants: configured in src/config/tenants.json (branding, colors, thresholds, webhookUrl, requiresBackDocument, dataVerificationApiUrl, maxVerificationAttempts). No database; adding or editing a tenant today requires a code change and redeploy.
- i18n: src/i18n/en.json and es.json, selected via the ?lang= URL param. Covers all UI strings, including the marketing landing page (landing.* keys).

### External API contract for data-verification

A tenant's dataVerificationApiUrl must respond to:

    GET {url}?documentNumber=X

    200 -> { "found": true, "firstName": "...", "lastName": "...", "documentNumber": "...", "birthDate": "YYYY-MM-DD" }
    200 -> { "found": false }

See amplify/functions/mock-client-api-handler/ for a working reference implementation.

## Webhook Integration Guide

This is the reference every tenant needs to receive and trust verification results.

### Payload shape

Every service notifies the tenant's webhookUrl with this JSON shape (POST, Content-Type: application/json):

    {
      "tenant": "1",
      "service": "ocr",
      "timestamp": "2026-07-23T10:00:00.000Z",
      "geolocation": "Bogota, Colombia",
      "reference": null,
      "data": { }
    }

- tenant: the tenant id from the ?tenant= URL param
- service: ocr, liveness, compare-faces, or data-verification
- timestamp: ISO 8601, when the result was produced
- geolocation: a human-readable address string from the browser's geolocation, or null if unavailable/denied
- reference: the ?reference= URL param passed through untouched, or null if not provided. Used to correlate a result back to an external conversation (e.g. a WhatsApp phone number) — the tenant assigns meaning to this value, the SDK never inspects it
- data: service-specific result body (see each service's handler for its exact shape — e.g. ocr returns extracted fields plus a confidence score; compare-faces returns similarity/isMatch; data-verification returns ocrData, externalApiData, and a Bedrock-generated analysis)

### Verifying the signature (HMAC-SHA256)

If the backend has WEBHOOK_SIGNING_SECRET configured, every outgoing webhook POST includes an X-Webhook-Signature header: the hex-encoded HMAC-SHA256 of the exact raw request body, using the shared secret.

Important: this is currently a single secret shared across all tenants (not one secret per tenant), a deliberate tradeoff since tenant config lives in a committed JSON file with no secure per-tenant secret storage yet. Treat it as sensitive — do not share it over insecure channels, and expect it to protect against spoofed/tampered requests, not to provide per-tenant isolation.

Node.js example:

    const crypto = require('crypto');

    function verifyWebhookSignature(rawBody, receivedSignature, secret) {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedSignature, 'hex'));
    }

    app.post('/my-webhook', express.raw({ type: 'application/json' }), (req, res) => {
      const signature = req.headers['x-webhook-signature'];
      const rawBody = req.body.toString('utf8'); // must be the raw body, not re-serialized JSON
      if (!verifyWebhookSignature(rawBody, signature, process.env.WEBHOOK_SIGNING_SECRET)) {
        return res.status(401).send('Invalid signature');
      }
      const payload = JSON.parse(rawBody);
      // ...handle payload
    });

Python example:

    import hmac
    import hashlib

    def verify_webhook_signature(raw_body: bytes, received_signature: str, secret: str) -> bool:
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, received_signature)

    signature = event['headers'].get('x-webhook-signature')
    raw_body = event['body']
    if not verify_webhook_signature(raw_body.encode(), signature, WEBHOOK_SIGNING_SECRET):
        return {'statusCode': 401, 'body': 'Invalid signature'}

Common mistake: computing the HMAC over a JSON.parse() → JSON.stringify() round-trip instead of the original raw bytes. Any change in key order, whitespace, or escaping produces a different signature even though the "content" looks the same. Always sign/verify against the exact raw request body.

## WhatsApp Integration Guide

This lets a business run verification entirely from a WhatsApp conversation: the bot sends a link, the user completes verification in their browser, and the bot replies with the result — no app to install.

### Architecture

    Meta WhatsApp Cloud API
      -> your own webhook router (external to this repo; forwards by phone_number_id)
        -> amplify/functions/whatsapp-inbound-handler/  (stateless menu + link generation)
      <- user opens the generated /verify?... link in their browser
        -> completes verification
      -> amplify/functions/<service>-handler/ notifies the tenant's webhookUrl
        -> amplify/functions/webhook-handler/ (if configured as the tenant's webhookUrl)
          -> replies to the user via WhatsApp Cloud API, using the reference field as the phone number

This repo does not include a Meta webhook router — you need your own Lambda (or equivalent) that receives Meta's raw webhook events and forwards them to whatsapp-inbound-handler's Function URL. Meta calls your router; your router calls this SDK's Lambda.

### whatsapp-inbound-handler

Receives the forwarded WhatsApp message body (Meta's raw format, unmodified) and runs a stateless flow — no conversation state is persisted:

- Any message that is purely digits (5-15 characters) is treated as a document number: looks it up via MOCK_CLIENT_API_URL (or the tenant's real API), and if found, replies with a data-verification link including that number as docRef and the user's phone number as reference
- "1" through "4" select one of the four services directly (liveness, ocr, compare-faces link generation — no lookup needed for these)
- Any other message shows the menu

Required environment variables (set in Amplify Console, never hardcoded):

| Variable | Purpose |
|---|---|
| WHATSAPP_ACCESS_TOKEN | Meta Cloud API access token |
| WHATSAPP_PHONE_NUMBER_ID | Meta phone_number_id for the sending number |
| MOCK_CLIENT_API_URL | External API used to look up a document number (auto-set to the mock handler's URL in backend.ts; point it at a real tenant API in production) |
| VERIFICATION_BASE_URL | Public base URL used to build the /verify link sent to users (defaults to PRODUCTION_ORIGIN) |
| DEFAULT_TENANT | Which tenant id the generated links use |

### webhook-handler (WhatsApp replies)

A single generic webhook, used as the demo tenants' webhookUrl. It always logs the event, and additionally sends a WhatsApp reply when the payload's reference field is non-null — this is the same signal that distinguishes a WhatsApp-originated verification from a regular one (see amplify/functions/webhook-handler/whatsappReply.ts for the reply logic per service).

If you build your own tenant webhook instead of using this one, replicate that same check: only attempt a WhatsApp reply (or any reference-based routing) when reference is present, and treat a null reference as "this didn't come from a conversational channel."

### Connecting your router to this SDK

1. Deploy whatsapp-inbound-handler (already included, gets its own Function URL)
2. Get its Function URL from amplify_outputs.json (whatsappInboundHandlerUrl) — or from AWS Console → Lambda for the production stack
3. In your own router, configure it to forward Meta's webhook body to that URL for the phone_number_id(s) you want handled by this SDK
4. Set a tenant's webhookUrl (in tenants.json) to webhook-handler's Function URL if you want WhatsApp replies; leave it as a different webhook if you don't

Note: Function URLs are regenerated whenever a Lambda's name or entry changes in its resource.ts — if you ever see 403/CORS errors that don't match a code issue, re-check the Function URL matches what's configured in your router and in tenants.json, since sandbox and production deployments each get their own independent set of URLs.

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

For local WhatsApp testing, also export these before running the sandbox (never commit real values):

    export WHATSAPP_ACCESS_TOKEN="..."
    export WHATSAPP_PHONE_NUMBER_ID="..."
    export WEBHOOK_SIGNING_SECRET="$(openssl rand -hex 32)"

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
| WEBHOOK_SIGNING_SECRET | Backend, HMAC secret for signing/verifying webhook payloads (generate with openssl rand -hex 32) |
| WHATSAPP_ACCESS_TOKEN | Backend, Meta Cloud API token (only needed if using the WhatsApp flow) |
| WHATSAPP_PHONE_NUMBER_ID | Backend, Meta phone_number_id (only needed if using the WhatsApp flow) |

Important: if you change a function's name or entry in its resource.ts, its Function URL is regenerated. Remember to update the corresponding VITE_* variable both in .env and in Amplify Console — sandbox and production deployments each get their own independent set of Function URLs, so a URL confirmed in one environment does not apply to the other.

## Known limitations

- Lambda Function URLs have no built-in rate limiting (see docs/rate-limiting.md for mitigation options)
- Tenant config lives in a committed JSON file; adding a tenant requires a code change and redeploy
- Webhook signing uses a single global secret shared across all tenants, not per-tenant secrets
- OCR/data-verification field extraction can occasionally misread specific documents (e.g. date formatting quirks); the confidence score and data-verification's Bedrock-based comparison step help surface these as low-confidence or mismatches rather than silently returning wrong data
- notifyWebhook is best-effort with no retry: if a tenant's webhook is briefly unreachable, that specific notification is lost (visible only in CloudWatch logs), not queued for retry
- The end user's browser waits for the webhook delivery attempt to finish before receiving its own response, since notifyWebhook is awaited synchronously in each handler — under a slow/unreachable tenant webhook, this adds latency to the user's experience even though the verification result itself already succeeded

## Roadmap ideas (not yet built)

- Combined KYC flow: OCR + Liveness + Compare Faces in one sequence with a single webhook, reusing the front document photo for both OCR and face comparison
- A local admin form (dev-only) to fill out and write tenants.json entries without hand-editing JSON
- Move tenant config to a database, so a future admin form could update it live instead of requiring a commit + redeploy, and so webhook signing secrets and thresholds could be managed per tenant
- API Gateway with per-tenant API keys, or AWS WAF, for production-grade rate limiting and access control
- SQS-backed webhook delivery, to decouple the user's response from webhook delivery and add automatic retries with a dead-letter queue for failed notifications
- A dedicated Meta webhook router included in this repo, instead of assuming an external one already exists

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
