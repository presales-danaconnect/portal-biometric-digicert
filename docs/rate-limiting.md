# Rate Limiting Notes

Amplify Gen 2's `defineFunction` creates Lambdas with Function URLs (not API Gateway). This means there's no built-in access to Usage Plans or API Keys for rate limiting — a capability that API Gateway provides natively but Function URLs don't.

This applies to all three Lambda Function URLs in this project: `ocr-handler`, `liveness-handler`, and `compare-faces-handler`.

## Options if rate limiting becomes necessary

### Option 1: AWS WAF with Lambda Function URL (recommended)
- Deploy WAF with rate-limiting rules
- Associate WAF with the Function URL
- AWS WAF supports:
  - Rate-based rules (e.g., 100 requests per 5 minutes)
  - Managed rules for common attacks
  - Custom rule matching

### Option 2: Use API Gateway instead of Function URL
- Create a REST API with API Gateway
- Configure Usage Plans with rate/quota limits
- More control, but more complex setup

### Option 3: Amplify Console settings
- Configure protection features in the Amplify Console
- Basic throttling available in hosting settings

## Current protections already implemented
- Reserved concurrency: 5 concurrent executions (in each function's `resource.ts`)
- Payload size limit: 5MB per image (in each handler)
- CloudWatch logging with source IP for audit (in each handler)
- Token validation hook ready for future API key auth (in `ocr-handler.ts`, not yet applied to the others)

## To add AWS WAF rate limiting
1. Deploy the functions first (already done via `npx ampx sandbox` / pipeline deploy)
2. Go to AWS Console → WAF → Create web ACL
3. Associate with the Lambda Function URL(s)
4. Add a rate-based rule: 100 requests per 5 minutes per IP
