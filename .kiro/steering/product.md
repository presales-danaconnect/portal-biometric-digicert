---
inclusion: always
---

# Product Overview: Identity Verification SDK as a Service

## What is this?
Identity Verification SDK is a SaaS platform that allows businesses to embed identity verification flows into their applications via URL or iframe integration.

## Target Customers
- Fintech companies needing KYC (Know Your Customer) compliance
- Marketplaces verifying user identities
- HR platforms for employee onboarding
- Healthcare portals for patient verification
- Any business requiring secure identity validation

## Core Workflow

### Tenant + Webhook Flow
1. **Client Embedding**: Businesses embed a URL in their app:
   ```
   https://dominio.com/verify?service={service}&tenant={tenant_id}
   ```

2. **Service Parameters**:
   - `service` defines which verification to execute:
     - `liveness`: Real-time face detection and liveliness check
     - `ocr`: Document verification and text extraction
     - `compare-faces`: Face matching between two images
   - `tenant`: Client business identifier (NOT called "company_id" for security)

3. **Tenant Resolution**:
   - System looks up the tenant configuration
   - Retrieves the configured `webhook_url` (currently from environment variables, not database)

4. **Service Execution**:
   - Executes the corresponding AWS service:
     - Amazon Rekognition for liveness and face comparison
     - AWS Bedrock (Claude Sonnet 4.5 multimodal) for OCR and structured document extraction

5. **Result Delivery**:
   - Upon completion, system makes a POST request with verification results to the client's `webhook_url`
   - Client systems receive structured JSON with verification outcomes

## Key Features
- **Multi-tenant Architecture**: Each client (tenant) has isolated configuration
- **Service Flexibility**: Multiple verification methods in one SDK
- **Webhook Integration**: Asynchronous result delivery
- **Security-First Design**: Tenant identifiers avoid exposing internal naming conventions
- **Embeds Anywhere**: Works in iframes or standalone pages

## Use Cases
1. **Digital Onboarding**: Verify new users during signup
2. **Transaction Authorization**: Confirm identity for high-value transactions
3. **Access Control**: Secure entry to restricted systems
4. **Compliance Auditing**: Maintain KYC/AML compliance records