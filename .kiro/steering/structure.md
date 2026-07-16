---
inclusion: always
---

# Project Structure & Architecture

## Folder Organization

    identity-verification-sdk/
    amplify/                          AWS Amplify Gen 2 backend
      auth/resource.ts                Cognito Identity Pool (unauthenticated/guest access enabled)
      backend.ts                      Main backend definition: registers functions, Function URLs, IAM policies
      functions/
        ocr-handler/                  Bedrock OCR + document validation
          resource.ts                 defineFunction() config
          handler.ts                  re-exports the real handler
          ocr-handler.ts              actual Lambda logic
          ocrPrompt.ts                Bedrock prompt, kept separate from handler logic
          package.json                own dependencies (aws-sdk client-bedrock-runtime, etc.)
        liveness-handler/              Rekognition Face Liveness session create/results
          resource.ts, handler.ts, liveness-handler.ts, package.json
        compare-faces-handler/         Document validation + Rekognition CompareFaces
          resource.ts, handler.ts, compare-faces-handler.ts
          documentValidationPrompt.ts  Bedrock prompt for "is this a real ID document" check
          package.json
        shared/                        Code imported by all three Lambdas
          cors.ts                      getCorsHeaders(), reads PRODUCTION_ORIGIN env var
          webhookNotifier.ts           notifyWebhook() - POSTs results to the tenant's webhook
    src/                                React frontend
      App.tsx                          Reads ?service, ?tenant, ?lang from the URL; routes to the right verification component; renders Header/Footer from tenant config
      main.tsx                         Amplify.configure(outputs) + React root
      components/
        layout/
          Header.tsx                  Tenant logo/title, configurable background/font color/alignment
          Footer.tsx                  Tenant privacy policy/website links
        verification/
          AutoCamera.tsx               Self-contained camera capture with guide overlay and auto-capture timer
          OCRVerification.tsx          Full OCR flow: capture front/back, submit, show results
          LivenessCheck.tsx            Full Liveness flow: create session, FaceLivenessDetector, show confidence result
          CompareFacesVerification.tsx Document capture + validation, then Liveness, then compare
      config/
        tenants.json                   Per-tenant config: branding, colors, thresholds, webhookUrl
        tenantConfig.ts                getTenantConfig(tenantId) with fallback to "default"
      services/
        api.ts                         callOCRAPI() - talks to ocr-handler
        liveness.ts                    createLivenessSession(), getLivenessResults() - talks to liveness-handler
        compareFaces.ts                validateDocument(), compareFaces() - talks to compare-faces-handler
        geolocation.ts                 getLocation() - browser geolocation + Nominatim reverse geocoding
      hooks/
        useGeolocation.ts               Captures location once on mount, kept in memory until sent to a webhook
      i18n/
        en.json, es.json               Translation dictionaries, one key per UI string
        i18n.ts                        useTranslation() hook; resolves language from ?lang= URL param
        livenessDictionary.ts          Separate dictionary for FaceLivenessDetector's own displayText prop
    public/                             Static assets (tenant logos, etc.)
    docs/
      rate-limiting.md                 Notes on Lambda Function URL rate limiting options
    amplify.yml                        CI/CD buildspec; each Lambda's deps must be installed here explicitly
    .env                               Local-only, VITE_*_API_ENDPOINT values (gitignored)

## URL Parameter Resolution

### URL Structure

    https://your-domain.com/verify?service={service}&tenant={tenant_id}&lang={lang}

### Parameter Processing Flow

This is handled entirely inside `App.tsx` on mount, with no router library:

1. `URLSearchParams(window.location.search)` extracts `service`, `tenant`, `lang`
2. `service` defaults to `"default"` (renders the demo home screen with three buttons) if missing or unrecognized
3. `tenant` defaults to `"demo"` if missing
4. `getTenantConfig(tenant)` looks up `tenants.json`; falls back to the `"default"` entry if the tenant ID isn't found
5. `lang` defaults to `"en"` if missing or not `"es"`
6. `App.tsx`'s `renderService()` switch renders the matching component: `OCRVerification`, `LivenessCheck`, `CompareFacesVerification`, or the demo home screen

### Tenant Resolution (real implementation)

    // src/config/tenantConfig.ts
    export function getTenantConfig(tenantId: string): TenantConfig {
      return tenants[tenantId] || tenants['default'];
    }

Tenant config is a plain JSON file committed to the repo (`src/config/tenants.json`), not environment variables and not a database. Adding or editing a tenant requires a code change and a redeploy.

## Backend Request Flow

1. Frontend captures image(s) via `AutoCamera` (OCR, Compare Faces) or `FaceLivenessDetector` (Liveness, Compare Faces)
2. Frontend calls its service's Lambda Function URL directly with `fetch`, passing `tenant`, `webhookUrl`, `geolocation` alongside the service-specific payload
3. Lambda does the actual AWS AI work (Bedrock and/or Rekognition)
4. Lambda calls `notifyWebhook()` (server-to-server, no CORS issue) to POST the result to the tenant's `webhookUrl`
5. Lambda also returns a lighter-weight JSON response to the frontend so it can render the result in the UI

## Key Architectural Decisions

### One Lambda per service, no shared "API" Lambda
Each verification service is a fully separate Lambda with its own Function URL, its own `package.json`/dependencies, and its own IAM permissions. This keeps blast radius small and lets each service scale/fail independently. The tradeoff: any code shared across them (CORS, webhook delivery) lives in `amplify/functions/shared/` and must be imported explicitly by each handler.

### No API Gateway
Lambda Function URLs are used instead of API Gateway, for simplicity. The known limitation is no built-in rate limiting (see `docs/rate-limiting.md`).

### Webhook delivery happens server-to-server
Lambdas notify the tenant's webhook directly. The browser never calls the tenant's webhook, both because tenant webhooks usually don't have CORS configured for browser calls, and to avoid exposing webhook URLs to the client.

### Tenant config as a committed JSON file (for now)
Simple to reason about, no extra infrastructure, but requires a redeploy to add or edit a tenant. A database-backed version is a known future improvement, not yet built.

### Bedrock-based document validation before expensive/slow steps
Both `ocr-handler` and `compare-faces-handler` validate with Bedrock that a captured photo is actually a real identity document before doing anything else (extracting fields, or running the Liveness+CompareFaces flow), so users get fast, clear feedback instead of a document Rekognition can't process meaningfully.
